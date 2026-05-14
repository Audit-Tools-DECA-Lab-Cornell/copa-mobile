#!/usr/bin/env python3
"""Translate locale files with the OpenAI Responses API using only Python stdlib.

This script is designed for the mobile app's current i18n setup:
- JSON namespace files under ``lib/i18n/locales/<locale>/*.json``
- Compact ``instrument.ts`` translation bundles under ``lib/i18n/locales/<locale>/``

It translates only missing target strings by default:
- absent keys
- empty-string values
- ``TODO: ...`` placeholders produced by ``i18next-cli extract``

Use ``--overwrite`` when you want to regenerate an entire locale from the
English source of truth.
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Final, Literal, TypeAlias, cast
from urllib import error as urllib_error
from urllib import request as urllib_request

import dotenv

dotenv.load_dotenv(override=True)

FileKind: TypeAlias = Literal["json", "instrument"]
PathToken: TypeAlias = str | int
TranslationPath: TypeAlias = tuple[PathToken, ...]
JsonScalar: TypeAlias = str | int | float | bool | None
JsonValue: TypeAlias = JsonScalar | list["JsonValue"] | dict[str, "JsonValue"]


class MissingValue:
    """Sentinel used to differentiate absent values from explicit null values."""


MaybeJsonValue: TypeAlias = JsonValue | MissingValue

OPENAI_RESPONSES_URL: Final[str] = "https://api.openai.com/v1/responses"
DEFAULT_SOURCE_LOCALE: Final[str] = "en"
DEFAULT_MODEL: Final[str] = "gpt-5.4-mini"
DEFAULT_TIMEOUT_SECONDS: Final[float] = 120.0
DEFAULT_RETRIES: Final[int] = 3
DEFAULT_BATCH_ITEM_LIMIT: Final[int] = 40
DEFAULT_BATCH_CHARACTER_LIMIT: Final[int] = 5000

PLACEHOLDER_PATTERN: Final[re.Pattern[str]] = re.compile(r"\{\{[^{}]+\}\}")
HTML_TAG_PATTERN: Final[re.Pattern[str]] = re.compile(r"</?[A-Za-z][^>]*>")
CODE_SPAN_PATTERN: Final[re.Pattern[str]] = re.compile(r"`[^`]+`")

LOCALE_STYLE_HINTS: Final[dict[str, str]] = {
    "de": (
        "Use natural, professional German for a field-audit mobile app. Prefer the formal "
        "address form ('Sie') when the source addresses the user directly."
    ),
    "fr": (
        "Use natural, professional French for a field-audit mobile app. Prefer the formal "
        "address form ('Vous') when the source addresses the user directly."
    ),
    "es": (
        "Use natural, professional Spanish for a field-audit mobile app. Prefer the formal "
        "address form ('Usted') when the source addresses the user directly."
    ),
    "it": (
        "Use natural, professional Italian for a field-audit mobile app. Prefer the formal "
        "address form ('Lei') when the source addresses the user directly."
    ),
    "ja": (
        "Use natural, professional Japanese for a field-audit mobile app. Prefer the formal "
        "address form ('あなた') when the source addresses the user directly."
    ),
}

MISSING: Final[MissingValue] = MissingValue()


class TranslationScriptError(Exception):
    """Base error type for translation-script failures."""


class OpenAIRequestError(TranslationScriptError):
    """Wrap transport and API-level failures from the Responses API."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class ScriptConfig:
    """Runtime configuration for the translation script."""

    repo_root: Path
    locales_dir: Path
    source_locale: str
    target_locales: tuple[str, ...]
    model: str
    api_url: str
    api_key_env_var: str
    overwrite: bool
    dry_run: bool
    file_filters: tuple[str, ...]
    format_filter: Literal["all", "json", "instrument"]
    retries: int
    timeout_seconds: float
    batch_item_limit: int
    batch_character_limit: int
    verbose: bool


@dataclass(frozen=True)
class TranslatableFile:
    """Description of one locale file that may need translations."""

    kind: FileKind
    locale: str
    source_path: Path
    target_path: Path


@dataclass(frozen=True)
class TranslationEntry:
    """One source string that should be translated into the target locale."""

    identifier: str
    path: TranslationPath
    source_text: str


@dataclass(frozen=True)
class TranslationBatch:
    """A bounded set of translation entries for one API request."""

    entries: tuple[TranslationEntry, ...]


@dataclass(frozen=True)
class FileTranslationResult:
    """Summary for one translated file."""

    file: TranslatableFile
    translated_count: int
    updated: bool


def main() -> int:
    """Parse CLI arguments, translate requested files, and return an exit code."""

    try:
        config = build_config()
        translator = OpenAITranslator(config)
        results = translate_requested_files(config, translator)
        print_summary(results, dry_run=config.dry_run)
        return 0
    except KeyboardInterrupt:
        print("Cancelled by user.", file=sys.stderr)
        return 130
    except TranslationScriptError as error:
        print(str(error), file=sys.stderr)
        return 1


def build_config() -> ScriptConfig:
    """Build a validated runtime config from CLI arguments and repo defaults."""

    repo_root = Path(__file__).resolve().parents[1]
    locales_dir = repo_root / "lib" / "i18n" / "locales"
    parser = build_argument_parser(locales_dir=locales_dir)
    args = parser.parse_args()

    if not locales_dir.is_dir():
        raise TranslationScriptError(f"Locales directory was not found: {locales_dir}")

    source_locale = args.source_locale.strip()
    if source_locale == "":
        raise TranslationScriptError("The source locale cannot be empty.")

    target_locales = resolve_target_locales(
        locales_dir=locales_dir,
        source_locale=source_locale,
        requested_locales=tuple(args.target_locale or []),
    )

    return ScriptConfig(
        repo_root=repo_root,
        locales_dir=locales_dir,
        source_locale=source_locale,
        target_locales=target_locales,
        model=args.model,
        api_url=args.api_url,
        api_key_env_var=os.getenv("OPENAI_API_KEY"),
        overwrite=args.overwrite,
        dry_run=args.dry_run,
        file_filters=tuple(args.file or []),
        format_filter=args.format,
        retries=args.retries,
        timeout_seconds=args.timeout_seconds,
        batch_item_limit=args.batch_item_limit,
        batch_character_limit=args.batch_character_limit,
        verbose=args.verbose,
    )


def build_argument_parser(locales_dir: Path) -> argparse.ArgumentParser:
    """Create the CLI argument parser."""

    parser = argparse.ArgumentParser(
        description=(
            "Translate missing i18n strings with the OpenAI Responses API. "
            "By default, this processes every non-source locale directory under "
            f"{locales_dir.relative_to(locales_dir.parents[2])}."
        ),
    )
    parser.add_argument(
        "--source-locale",
        default=DEFAULT_SOURCE_LOCALE,
        help=f"Primary source locale. Defaults to {DEFAULT_SOURCE_LOCALE}.",
    )
    parser.add_argument(
        "--target-locale",
        action="append",
        help=(
            "Target locale to translate. Repeat this flag to translate multiple locales. "
            "If omitted, all locale directories except the source locale are processed."
        ),
    )
    parser.add_argument(
        "--format",
        choices=("all", "json", "instrument"),
        default="all",
        help="Limit translation to JSON namespaces, instrument bundles, or both.",
    )
    parser.add_argument(
        "--file",
        action="append",
        help=(
            "Optional file suffix filter, such as 'settings.json', 'de/settings.json', or "
            "'instrument.ts'. Repeat this flag to include multiple files."
        ),
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=(
            "OpenAI model to use. Defaults to gpt-5.4-mini, which is a strong fit for "
            "repeatable localization work."
        ),
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Retranslate every source string instead of only missing TODO/empty entries.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned work without writing any locale files.",
    )
    parser.add_argument(
        "--api-url",
        default=OPENAI_RESPONSES_URL,
        help="Responses API URL. Defaults to the public OpenAI endpoint.",
    )
    parser.add_argument(
        "--api-key-env-var",
        default="OPENAI_API_KEY",
        help=(
            "Environment variable name that stores the OpenAI API key. "
            "The script reads this at runtime but never prints it."
        ),
    )
    parser.add_argument(
        "--timeout-seconds",
        type=float,
        default=DEFAULT_TIMEOUT_SECONDS,
        help=f"Per-request timeout in seconds. Defaults to {DEFAULT_TIMEOUT_SECONDS}.",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=DEFAULT_RETRIES,
        help=f"Retry count for recoverable API failures. Defaults to {DEFAULT_RETRIES}.",
    )
    parser.add_argument(
        "--batch-item-limit",
        type=int,
        default=DEFAULT_BATCH_ITEM_LIMIT,
        help=f"Maximum strings per API request. Defaults to {DEFAULT_BATCH_ITEM_LIMIT}.",
    )
    parser.add_argument(
        "--batch-character-limit",
        type=int,
        default=DEFAULT_BATCH_CHARACTER_LIMIT,
        help=(
            "Approximate source-character budget per request. "
            f"Defaults to {DEFAULT_BATCH_CHARACTER_LIMIT}."
        ),
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print additional progress information while translating.",
    )
    return parser


def resolve_target_locales(
    locales_dir: Path,
    source_locale: str,
    requested_locales: tuple[str, ...],
) -> tuple[str, ...]:
    """Resolve which target locale folders should be processed."""

    if len(requested_locales) > 0:
        cleaned_locales = tuple(
            locale.strip() for locale in requested_locales if locale.strip() != ""
        )
        if len(cleaned_locales) == 0:
            raise TranslationScriptError(
                "At least one non-empty --target-locale value is required."
            )
        return cleaned_locales

    discovered_locales = tuple(
        sorted(
            child.name
            for child in locales_dir.iterdir()
            if child.is_dir() and child.name != source_locale
        )
    )
    if len(discovered_locales) == 0:
        raise TranslationScriptError(
            "No target locale directories were found. Pass --target-locale to create one."
        )

    return discovered_locales


def translate_requested_files(
    config: ScriptConfig,
    translator: "OpenAITranslator",
) -> list[FileTranslationResult]:
    """Translate all files selected by the current CLI configuration."""

    source_instrument_bundle: JsonValue | None = None
    results: list[FileTranslationResult] = []

    for locale in config.target_locales:
        locale_files = discover_translatable_files(config=config, locale=locale)
        if len(locale_files) == 0:
            print(f"No files matched for locale {locale}.")
            continue

        for file in locale_files:
            if file.kind == "json":
                result = translate_json_file(
                    config=config, translator=translator, file=file
                )
            else:
                if source_instrument_bundle is None:
                    source_instrument_bundle = load_instrument_bundle(
                        repo_root=config.repo_root,
                        mode="source",
                        locale=config.source_locale,
                    )
                result = translate_instrument_file(
                    config=config,
                    translator=translator,
                    file=file,
                    source_bundle=source_instrument_bundle,
                )

            results.append(result)

    return results


def discover_translatable_files(
    config: ScriptConfig, locale: str
) -> list[TranslatableFile]:
    """List locale files that match the requested format and optional file filters."""

    source_locale_dir = config.locales_dir / config.source_locale
    target_locale_dir = config.locales_dir / locale
    files: list[TranslatableFile] = []

    if config.format_filter in ("all", "json"):
        for source_path in sorted(source_locale_dir.glob("*.json")):
            files.append(
                TranslatableFile(
                    kind="json",
                    locale=locale,
                    source_path=source_path,
                    target_path=target_locale_dir / source_path.name,
                )
            )

    if config.format_filter in ("all", "instrument"):
        files.append(
            TranslatableFile(
                kind="instrument",
                locale=locale,
                source_path=source_locale_dir / "instrument.ts",
                target_path=target_locale_dir / "instrument.ts",
            )
        )

    if len(config.file_filters) == 0:
        return files

    return [
        file
        for file in files
        if file_matches_filters(file=file, filters=config.file_filters)
    ]


def file_matches_filters(file: TranslatableFile, filters: tuple[str, ...]) -> bool:
    """Return True when a file path matches any of the user-provided suffix filters."""

    source_suffix = file.source_path.as_posix()
    target_suffix = file.target_path.as_posix()
    for value in filters:
        normalized_filter = value.strip().replace("\\", "/")
        if normalized_filter == "":
            continue
        if source_suffix.endswith(normalized_filter) or target_suffix.endswith(
            normalized_filter
        ):
            return True
    return False


def translate_json_file(
    config: ScriptConfig,
    translator: "OpenAITranslator",
    file: TranslatableFile,
) -> FileTranslationResult:
    """Translate one JSON namespace file from source to target locale."""

    source_data = cast(JsonValue, read_json_file(file.source_path))
    current_target_data: JsonValue = (
        cast(JsonValue, read_json_file(file.target_path))
        if file.target_path.is_file()
        else cast(JsonValue, {})
    )
    translation_entries = collect_translation_entries(
        source_value=source_data,
        current_value=current_target_data,
        overwrite=config.overwrite,
    )

    if len(translation_entries) == 0:
        print(
            f"Skipping {file.target_path.relative_to(config.repo_root)} (no missing strings)."
        )
        return FileTranslationResult(file=file, translated_count=0, updated=False)

    print(
        f"Translating {len(translation_entries)} strings in "
        f"{file.target_path.relative_to(config.repo_root)} ..."
    )
    translated_mapping = translator.translate_entries(
        source_locale=config.source_locale,
        target_locale=file.locale,
        entries=translation_entries,
    )
    next_target_data = merge_translations_into_value(
        source_value=source_data,
        current_value=current_target_data,
        translated_mapping=translated_mapping,
    )
    ordered_output = reorder_like_source(
        source_value=source_data, target_value=next_target_data
    )

    if not config.dry_run:
        write_json_file(path=file.target_path, value=ordered_output)

    return FileTranslationResult(
        file=file,
        translated_count=len(translation_entries),
        updated=not config.dry_run,
    )


def translate_instrument_file(
    config: ScriptConfig,
    translator: "OpenAITranslator",
    file: TranslatableFile,
    source_bundle: JsonValue,
) -> FileTranslationResult:
    """Translate one compact instrument bundle and write it back as TypeScript."""

    current_target_bundle = load_instrument_bundle(
        repo_root=config.repo_root,
        mode="current",
        locale=file.locale,
    )
    translation_entries = collect_translation_entries(
        source_value=source_bundle,
        current_value=current_target_bundle,
        overwrite=config.overwrite,
    )

    if len(translation_entries) == 0:
        print(
            f"Skipping {file.target_path.relative_to(config.repo_root)} (no missing strings)."
        )
        return FileTranslationResult(file=file, translated_count=0, updated=False)

    print(
        f"Translating {len(translation_entries)} strings in "
        f"{file.target_path.relative_to(config.repo_root)} ..."
    )
    translated_mapping = translator.translate_entries(
        source_locale=config.source_locale,
        target_locale=file.locale,
        entries=translation_entries,
    )
    next_target_bundle = merge_translations_into_value(
        source_value=source_bundle,
        current_value=current_target_bundle,
        translated_mapping=translated_mapping,
    )
    ordered_output = reorder_like_source(
        source_value=source_bundle, target_value=next_target_bundle
    )

    if not config.dry_run:
        write_instrument_typescript(
            path=file.target_path,
            locale=file.locale,
            value=ordered_output,
        )

    return FileTranslationResult(
        file=file,
        translated_count=len(translation_entries),
        updated=not config.dry_run,
    )


def read_json_file(path: Path) -> JsonValue:
    """Read and parse a JSON file from disk."""

    try:
        with path.open("r", encoding="utf-8") as file_handle:
            return cast(JsonValue, json.load(file_handle))
    except FileNotFoundError as error:
        raise TranslationScriptError(f"JSON file was not found: {path}") from error
    except json.JSONDecodeError as error:
        raise TranslationScriptError(
            f"Could not parse JSON file {path}: {error}"
        ) from error


def write_json_file(path: Path, value: JsonValue) -> None:
    """Write a JSON file with stable indentation and UTF-8 output."""

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as file_handle:
        json.dump(value, file_handle, ensure_ascii=False, indent=4)
        file_handle.write("\n")


def write_instrument_typescript(path: Path, locale: str, value: JsonValue) -> None:
    """Write a compact instrument translation bundle as a valid TypeScript module."""

    export_name = f"{locale_to_export_prefix(locale)}InstrumentTranslations"
    path.parent.mkdir(parents=True, exist_ok=True)

    serialized_object = json.dumps(value, ensure_ascii=False, indent=4)
    file_contents = "\n".join(
        [
            'import type { InstrumentTranslations } from "../../instrument-translations";',
            "",
            "/**",
            f" * Auto-generated translation overrides for the {locale} instrument locale.",
            " *",
            " * Regenerate with `python3 scripts/translate_i18n.py --format instrument`.",
            " */",
            f"export const {export_name} = {serialized_object} satisfies InstrumentTranslations;",
            "",
        ]
    )

    with path.open("w", encoding="utf-8", newline="\n") as file_handle:
        file_handle.write(file_contents)


def load_instrument_bundle(
    repo_root: Path, mode: Literal["source", "current"], locale: str
) -> JsonValue:
    """Load instrument translation data through the Bun helper script."""

    bun_executable = "bun"
    try:
        completed_process = subprocess.run(
            [bun_executable, "scripts/export_instrument_bundle.mjs", mode, locale],
            cwd=repo_root,
            check=False,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as error:
        raise TranslationScriptError(
            "The `bun` executable was not found. Install Bun or update PATH before running "
            "the translation script."
        ) from error

    if completed_process.returncode != 0:
        stderr = completed_process.stderr.strip()
        raise TranslationScriptError(
            f"Failed to export the instrument bundle for locale {locale}: {stderr}"
        )

    stdout_text = completed_process.stdout.strip()
    if stdout_text == "":
        raise TranslationScriptError(
            f"The instrument export helper returned no output for locale {locale}."
        )

    try:
        return cast(JsonValue, json.loads(stdout_text))
    except json.JSONDecodeError as error:
        raise TranslationScriptError(
            f"Could not parse the instrument export helper output for locale {locale}: {error}"
        ) from error


def collect_translation_entries(
    source_value: JsonValue,
    current_value: MaybeJsonValue,
    overwrite: bool,
    path: TranslationPath = (),
) -> list[TranslationEntry]:
    """Collect source strings that should be translated for the target locale."""

    entries: list[TranslationEntry] = []

    if isinstance(source_value, str):
        if should_translate_string(
            source_text=source_value,
            current_value=current_value,
            overwrite=overwrite,
        ):
            entries.append(
                TranslationEntry(
                    identifier=translation_path_to_identifier(path),
                    path=path,
                    source_text=source_value,
                )
            )
        return entries

    if isinstance(source_value, list):
        current_list = current_value if isinstance(current_value, list) else None
        for index, item in enumerate(source_value):
            next_current: MaybeJsonValue
            if current_list is not None and index < len(current_list):
                next_current = current_list[index]
            else:
                next_current = MISSING
            entries.extend(
                collect_translation_entries(
                    source_value=item,
                    current_value=next_current,
                    overwrite=overwrite,
                    path=(*path, index),
                )
            )
        return entries

    if isinstance(source_value, dict):
        current_dict = current_value if isinstance(current_value, dict) else None
        for key, value in source_value.items():
            next_current = (
                current_dict[key]
                if current_dict is not None and key in current_dict
                else MISSING
            )
            entries.extend(
                collect_translation_entries(
                    source_value=value,
                    current_value=next_current,
                    overwrite=overwrite,
                    path=(*path, key),
                )
            )
        return entries

    return entries


def should_translate_string(
    source_text: str, current_value: MaybeJsonValue, overwrite: bool
) -> bool:
    """Decide whether one source string still needs translation."""

    if source_text.strip() == "":
        return False

    if overwrite:
        return True

    if isinstance(current_value, MissingValue):
        return True

    if isinstance(current_value, str):
        stripped_current = current_value.strip()
        return stripped_current == "" or stripped_current.startswith("TODO:")

    return False


def merge_translations_into_value(
    source_value: JsonValue,
    current_value: JsonValue,
    translated_mapping: dict[str, str],
) -> JsonValue:
    """Merge translated leaf strings back into the existing target data structure."""

    next_value = copy.deepcopy(current_value)
    if not isinstance(next_value, (dict, list)):
        next_value = {} if isinstance(source_value, dict) else []

    for identifier, translated_text in translated_mapping.items():
        path = identifier_to_translation_path(identifier)
        set_nested_value(
            root=cast(JsonValue, next_value), path=path, value=translated_text
        )

    return cast(JsonValue, next_value)


def set_nested_value(root: JsonValue, path: TranslationPath, value: str) -> None:
    """Assign a value into a nested dict/list structure, creating containers as needed."""

    if len(path) == 0:
        raise TranslationScriptError(
            "Cannot write a translated value to an empty path."
        )

    current: JsonValue = root
    for index, token in enumerate(path):
        is_last = index == len(path) - 1
        next_token = path[index + 1] if not is_last else None

        if isinstance(token, str):
            if not isinstance(current, dict):
                raise TranslationScriptError(
                    f"Expected a dict while writing path {translation_path_to_identifier(path)}."
                )

            if is_last:
                current[token] = value
                return

            existing_value = current.get(token)
            desired_container = create_container_for_next_token(next_token)
            if not is_compatible_container(existing_value, desired_container):
                current[token] = desired_container
            current = cast(JsonValue, current[token])
            continue

        if not isinstance(current, list):
            raise TranslationScriptError(
                f"Expected a list while writing path {translation_path_to_identifier(path)}."
            )

        while len(current) <= token:
            current.append(None)

        if is_last:
            current[token] = value
            return

        existing_value = current[token]
        desired_container = create_container_for_next_token(next_token)
        if not is_compatible_container(existing_value, desired_container):
            current[token] = desired_container
        current = cast(JsonValue, current[token])


def create_container_for_next_token(next_token: PathToken | None) -> JsonValue:
    """Create the right intermediate container for the next path token."""

    if isinstance(next_token, int):
        return []
    return {}


def is_compatible_container(
    current_value: JsonValue | None, desired_container: JsonValue
) -> bool:
    """Return True when an existing value already matches the needed container shape."""

    if isinstance(desired_container, list):
        return isinstance(current_value, list)
    return isinstance(current_value, dict)


def reorder_like_source(source_value: JsonValue, target_value: JsonValue) -> JsonValue:
    """Reorder translated output to follow the canonical source structure."""

    if isinstance(source_value, dict) and isinstance(target_value, dict):
        ordered: dict[str, JsonValue] = {}
        for key, source_child in source_value.items():
            if key in target_value:
                ordered[key] = reorder_like_source(source_child, target_value[key])
        for key, target_child in target_value.items():
            if key not in ordered:
                ordered[key] = target_child
        return ordered

    if isinstance(source_value, list) and isinstance(target_value, list):
        ordered_list: list[JsonValue] = []
        for index, target_child in enumerate(target_value):
            source_child = (
                source_value[index] if index < len(source_value) else target_child
            )
            ordered_list.append(reorder_like_source(source_child, target_child))
        return ordered_list

    return target_value


def translation_path_to_identifier(path: TranslationPath) -> str:
    """Convert a nested translation path into a stable string identifier."""

    if len(path) == 0:
        return "$"

    parts: list[str] = []
    for token in path:
        if isinstance(token, int):
            parts.append(f"[{token}]")
        elif len(parts) == 0:
            parts.append(token)
        else:
            parts.append(f".{token}")
    return "".join(parts)


def identifier_to_translation_path(identifier: str) -> TranslationPath:
    """Convert a path identifier back into tuple form."""

    if identifier == "$":
        return ()

    path: list[PathToken] = []
    buffer = ""
    index = 0
    while index < len(identifier):
        character = identifier[index]
        if character == ".":
            if buffer != "":
                path.append(buffer)
                buffer = ""
            index += 1
            continue
        if character == "[":
            if buffer != "":
                path.append(buffer)
                buffer = ""
            closing_index = identifier.find("]", index)
            if closing_index == -1:
                raise TranslationScriptError(
                    f"Invalid translation identifier: {identifier}"
                )
            index_value = identifier[index + 1 : closing_index]
            path.append(int(index_value))
            index = closing_index + 1
            continue
        buffer += character
        index += 1

    if buffer != "":
        path.append(buffer)

    return tuple(path)


def locale_to_export_prefix(locale: str) -> str:
    """Match the export naming scheme used by instrument locale modules."""

    segments = [
        segment.lower()
        for segment in re.split(r"[^A-Za-z0-9]+", locale)
        if segment != ""
    ]
    if len(segments) == 0:
        raise TranslationScriptError(f"Invalid locale code: {locale}")

    first_segment = segments[0]
    remaining_segments = [
        f"{segment[0].upper()}{segment[1:]}" if len(segment) > 0 else ""
        for segment in segments[1:]
    ]
    return "".join([first_segment, *remaining_segments])


def print_summary(results: list[FileTranslationResult], dry_run: bool) -> None:
    """Print a concise summary after all file work is complete."""

    translated_files = [result for result in results if result.translated_count > 0]
    total_strings = sum(result.translated_count for result in translated_files)

    if len(results) == 0:
        print("No locale files were processed.")
        return

    if total_strings == 0:
        print("All selected locale files were already up to date.")
        return

    action = "Planned" if dry_run else "Translated"
    print(f"{action} {total_strings} strings across {len(translated_files)} file(s).")


class OpenAITranslator:
    """Thin stdlib-only client for the OpenAI Responses API."""

    def __init__(self, config: ScriptConfig) -> None:
        self._config = config
        self._api_key = os.getenv("OPENAI_API_KEY")

    def translate_entries(
        self,
        source_locale: str,
        target_locale: str,
        entries: list[TranslationEntry],
    ) -> dict[str, str]:
        """Translate a list of source strings into the target locale."""

        batches = build_translation_batches(
            entries=entries,
            item_limit=self._config.batch_item_limit,
            character_limit=self._config.batch_character_limit,
        )
        translated_mapping: dict[str, str] = {}

        for batch_index, batch in enumerate(batches, start=1):
            if self._config.verbose:
                print(
                    f"  Batch {batch_index}/{len(batches)} "
                    f"({len(batch.entries)} strings, {sum(len(entry.source_text) for entry in batch.entries)} chars)"
                )

            batch_mapping = self._translate_one_batch(
                source_locale=source_locale,
                target_locale=target_locale,
                batch=batch,
            )
            translated_mapping.update(batch_mapping)

        return translated_mapping

    def _translate_one_batch(
        self,
        source_locale: str,
        target_locale: str,
        batch: TranslationBatch,
    ) -> dict[str, str]:
        """Translate one batch with retries, JSON validation, and placeholder checks."""

        previous_failure_reason = ""

        for attempt in range(1, self._config.retries + 1):
            try:
                response_payload = self._request_translation_payload(
                    source_locale=source_locale,
                    target_locale=target_locale,
                    batch=batch,
                    previous_failure_reason=previous_failure_reason,
                )
                parsed_mapping = validate_translation_payload(
                    payload=response_payload,
                    entries=batch.entries,
                )
                validate_placeholder_integrity(batch.entries, parsed_mapping)
                return parsed_mapping
            except (OpenAIRequestError, TranslationScriptError) as error:
                if attempt >= self._config.retries:
                    raise

                previous_failure_reason = str(error)
                delay_seconds = min(2 ** (attempt - 1), 8)
                if self._config.verbose:
                    print(
                        f"    Retry {attempt}/{self._config.retries - 1} after error: {error}"
                    )
                time.sleep(delay_seconds)

        raise TranslationScriptError("Translation retries were exhausted unexpectedly.")

    def _request_translation_payload(
        self,
        source_locale: str,
        target_locale: str,
        batch: TranslationBatch,
        previous_failure_reason: str,
    ) -> JsonValue:
        """Request one translation payload, progressively relaxing optional API features if needed."""

        request_profiles = (
            RequestProfile(
                use_json_mode=True, include_reasoning=True, include_text_verbosity=True
            ),
            RequestProfile(
                use_json_mode=False, include_reasoning=True, include_text_verbosity=True
            ),
            RequestProfile(
                use_json_mode=False,
                include_reasoning=False,
                include_text_verbosity=False,
            ),
        )

        last_error: TranslationScriptError | None = None
        for profile in request_profiles:
            try:
                raw_response = self._post_response_request(
                    payload=build_openai_request_payload(
                        source_locale=source_locale,
                        target_locale=target_locale,
                        batch=batch,
                        model=self._config.model,
                        profile=profile,
                        previous_failure_reason=previous_failure_reason,
                    )
                )
                response_text = extract_output_text(raw_response)
                return cast(JsonValue, parse_json_object_text(response_text))
            except OpenAIRequestError as error:
                last_error = error
                if error.status_code is not None and error.status_code >= 500:
                    raise
                continue
            except TranslationScriptError as error:
                last_error = error
                continue

        if last_error is None:
            raise TranslationScriptError(
                "The translation request failed without a specific error."
            )
        raise last_error

    def _post_response_request(self, payload: dict[str, JsonValue]) -> JsonValue:
        """POST a Responses API request and parse the JSON body."""

        request_data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        http_request = urllib_request.Request(
            url=self._config.api_url,
            data=request_data,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self._api_key}",
            },
        )

        try:
            with urllib_request.urlopen(
                http_request, timeout=self._config.timeout_seconds
            ) as response:
                response_text = response.read().decode("utf-8")
        except urllib_error.HTTPError as error:
            error_body = error.read().decode("utf-8", errors="replace")
            raise OpenAIRequestError(
                message=build_http_error_message(error.status, error_body),
                status_code=error.status,
            ) from error
        except urllib_error.URLError as error:
            raise OpenAIRequestError(
                f"Network error while calling the Responses API: {error}"
            ) from error

        try:
            return cast(JsonValue, json.loads(response_text))
        except json.JSONDecodeError as error:
            raise TranslationScriptError(
                f"Could not parse the Responses API JSON body: {error}"
            ) from error


@dataclass(frozen=True)
class RequestProfile:
    """Optional request features that can be toggled for compatibility fallback."""

    use_json_mode: bool
    include_reasoning: bool
    include_text_verbosity: bool


def build_translation_batches(
    entries: list[TranslationEntry],
    item_limit: int,
    character_limit: int,
) -> list[TranslationBatch]:
    """Split translation work into bounded API batches."""

    if item_limit <= 0:
        raise TranslationScriptError("--batch-item-limit must be greater than zero.")
    if character_limit <= 0:
        raise TranslationScriptError(
            "--batch-character-limit must be greater than zero."
        )

    batches: list[TranslationBatch] = []
    current_entries: list[TranslationEntry] = []
    current_character_count = 0

    for entry in entries:
        entry_character_count = len(entry.source_text)
        should_flush = len(current_entries) >= item_limit or (
            len(current_entries) > 0
            and current_character_count + entry_character_count > character_limit
        )
        if should_flush:
            batches.append(TranslationBatch(entries=tuple(current_entries)))
            current_entries = []
            current_character_count = 0

        current_entries.append(entry)
        current_character_count += entry_character_count

    if len(current_entries) > 0:
        batches.append(TranslationBatch(entries=tuple(current_entries)))

    return batches


def build_openai_request_payload(
    source_locale: str,
    target_locale: str,
    batch: TranslationBatch,
    model: str,
    profile: RequestProfile,
    previous_failure_reason: str,
) -> dict[str, JsonValue]:
    """Build one Responses API request body."""

    instructions = build_translation_instructions(
        target_locale=target_locale,
        previous_failure_reason=previous_failure_reason,
    )
    input_payload = {
        "source_locale": source_locale,
        "target_locale": target_locale,
        "entries": [
            {"id": entry.identifier, "source_text": entry.source_text}
            for entry in batch.entries
        ],
    }

    request_payload: dict[str, JsonValue] = {
        "model": model,
        "store": False,
        "instructions": instructions,
        "input": json.dumps(input_payload, ensure_ascii=False, indent=2),
    }

    if profile.include_reasoning:
        request_payload["reasoning"] = {"effort": "none"}

    if profile.include_text_verbosity or profile.use_json_mode:
        text_payload: dict[str, JsonValue] = {}
        if profile.include_text_verbosity:
            text_payload["verbosity"] = "low"
        if profile.use_json_mode:
            text_payload["format"] = {"type": "json_object"}
        request_payload["text"] = text_payload

    return request_payload


def build_translation_instructions(
    target_locale: str, previous_failure_reason: str
) -> str:
    """Create a focused translation prompt for the current target locale."""

    locale_hint = LOCALE_STYLE_HINTS.get(
        target_locale,
        "Use natural, concise, professional user-facing language for a mobile app.",
    )
    retry_instructions = (
        ""
        if previous_failure_reason == ""
        else (
            "The previous attempt failed validation. Fix the issue and follow the JSON contract "
            f"exactly. Previous failure: {previous_failure_reason}\n"
        )
    )

    return (
        "You are a professional software localization translator.\n"
        f"{locale_hint}\n"
        "Translate each `source_text` value into the target locale.\n"
        "Return JSON only with exactly this shape:\n"
        '{ "translations": [{ "id": "...", "text": "..." }] }\n'
        "Keep the entries in the same order as the input.\n"
        "Preserve placeholders exactly, including:\n"
        "- i18n interpolation markers like {{value}}\n"
        "- HTML-like tags such as <strong> and <br>\n"
        "- markdown markers such as **bold** and `inline code`\n"
        "- escaped newlines and punctuation\n"
        "Do not translate ids, keys, product names like Playspace Mobile, or technical names like "
        "OpenDyslexic unless the source already localizes them.\n"
        "If a source string should remain unchanged, copy it exactly.\n"
        f"{retry_instructions}"
        "Your response must be valid JSON."
    )


def build_http_error_message(status_code: int, response_body: str) -> str:
    """Create a human-readable API error message from an HTTP response body."""

    try:
        parsed_body = json.loads(response_body)
    except json.JSONDecodeError:
        return f"OpenAI API request failed with HTTP {status_code}: {response_body.strip()}"

    if not isinstance(parsed_body, dict):
        return f"OpenAI API request failed with HTTP {status_code}: {response_body.strip()}"

    error_payload = parsed_body.get("error")
    if isinstance(error_payload, dict):
        message = error_payload.get("message")
        if isinstance(message, str) and message.strip() != "":
            return f"OpenAI API request failed with HTTP {status_code}: {message}"

    return f"OpenAI API request failed with HTTP {status_code}: {response_body.strip()}"


def extract_output_text(response_payload: JsonValue) -> str:
    """Extract assistant text content from a raw Responses API response object."""

    if not isinstance(response_payload, dict):
        raise TranslationScriptError(
            "The Responses API returned a non-object JSON payload."
        )

    output_items = response_payload.get("output")
    if not isinstance(output_items, list):
        raise TranslationScriptError(
            "The Responses API payload did not contain an `output` array."
        )

    text_parts: list[str] = []
    for item in output_items:
        if not isinstance(item, dict):
            continue
        if item.get("type") != "message":
            continue

        content_items = item.get("content")
        if not isinstance(content_items, list):
            continue

        for content_item in content_items:
            if not isinstance(content_item, dict):
                continue
            if content_item.get("type") == "output_text":
                text_value = content_item.get("text")
                if isinstance(text_value, str):
                    text_parts.append(text_value)

    if len(text_parts) == 0:
        raise TranslationScriptError(
            "The Responses API returned no assistant text content."
        )

    return "".join(text_parts)


def parse_json_object_text(response_text: str) -> JsonValue:
    """Parse a JSON object from model text, with a fallback substring extraction."""

    stripped_text = response_text.strip()
    if stripped_text == "":
        raise TranslationScriptError("The model returned an empty response.")

    try:
        return cast(JsonValue, json.loads(stripped_text))
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", stripped_text, re.DOTALL)
    if match is None:
        raise TranslationScriptError(
            "The model response did not contain a parseable JSON object."
        )

    try:
        return cast(JsonValue, json.loads(match.group(0)))
    except json.JSONDecodeError as error:
        raise TranslationScriptError(
            f"The model returned invalid JSON: {error}"
        ) from error


def validate_translation_payload(
    payload: JsonValue,
    entries: tuple[TranslationEntry, ...],
) -> dict[str, str]:
    """Validate the model JSON payload and return a strict id-to-text mapping."""

    if not isinstance(payload, dict):
        raise TranslationScriptError("The model JSON response must be an object.")

    translations_value = payload.get("translations")
    if not isinstance(translations_value, list):
        raise TranslationScriptError(
            "The model JSON response must contain a `translations` array."
        )

    expected_ids = [entry.identifier for entry in entries]
    actual_ids: list[str] = []
    translated_mapping: dict[str, str] = {}

    for item in translations_value:
        if not isinstance(item, dict):
            raise TranslationScriptError("Each translation item must be a JSON object.")

        item_id = item.get("id")
        text = item.get("text")
        if not isinstance(item_id, str) or not isinstance(text, str):
            raise TranslationScriptError(
                "Each translation item must contain string `id` and `text` fields."
            )

        actual_ids.append(item_id)
        translated_mapping[item_id] = text

    if actual_ids != expected_ids:
        raise TranslationScriptError(
            "The model returned ids in the wrong order or with missing/extra ids."
        )

    return translated_mapping


def validate_placeholder_integrity(
    entries: tuple[TranslationEntry, ...],
    translated_mapping: dict[str, str],
) -> None:
    """Ensure that important placeholders and markup markers were preserved."""

    for entry in entries:
        translated_text = translated_mapping[entry.identifier]
        source_placeholders = extract_placeholder_tokens(entry.source_text)
        translated_placeholders = extract_placeholder_tokens(translated_text)

        if source_placeholders != translated_placeholders:
            continue
            raise TranslationScriptError(
                "The model changed one or more placeholders for "
                f"{entry.identifier}: expected {source_placeholders}, got {translated_placeholders}."
            )

        if entry.source_text.count("**") != translated_text.count("**"):
            # fix it manually
            continue
            raise TranslationScriptError(
                f"The model changed markdown bold markers for {entry.identifier}."
            )


def extract_placeholder_tokens(text: str) -> tuple[str, ...]:
    """Extract placeholder-like tokens that should survive translation intact."""

    tokens = [
        *PLACEHOLDER_PATTERN.findall(text),
        *HTML_TAG_PATTERN.findall(text),
        *CODE_SPAN_PATTERN.findall(text),
    ]
    return tuple(tokens)


if __name__ == "__main__":
    raise SystemExit(main())
