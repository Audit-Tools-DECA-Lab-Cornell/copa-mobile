import {
    buildExecuteOverviewSummary,
    doesExecutionModeRequireSpaceAudit,
    getExecuteFlowSubject,
    type ExecuteOverviewSectionInput,
} from "./execute-flow";

/**
 * Assert that two primitive values are identical.
 *
 * @param actual Runtime value under test.
 * @param expected Expected value.
 * @param message Failure message prefix.
 */
function assertEqual<TValue>(actual: TValue, expected: TValue, message: string): void {
    if (actual !== expected) {
        throw new Error(
            `${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
        );
    }
}

/**
 * Assert that two structured values serialize identically.
 *
 * @param actual Runtime value under test.
 * @param expected Expected value.
 * @param message Failure message prefix.
 */
function assertDeepEqual(actual: unknown, expected: unknown, message: string): void {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
        throw new Error(`${message}: expected ${expectedJson}, received ${actualJson}.`);
    }
}

/**
 * Run the focused execute-flow regression checks.
 */
function main(): void {
    assertEqual(
        doesExecutionModeRequireSpaceAudit("survey"),
        false,
        "Survey mode should skip the onsite setup step",
    );
    assertEqual(
        doesExecutionModeRequireSpaceAudit("audit"),
        true,
        "Audit mode should require the onsite setup step",
    );
    assertEqual(
        doesExecutionModeRequireSpaceAudit("both"),
        true,
        "Combined mode should require the onsite setup step",
    );

    assertEqual(
        getExecuteFlowSubject(null),
        "workflow",
        "Unknown mode should fall back to a generic workflow subject",
    );
    assertEqual(
        getExecuteFlowSubject("survey"),
        "survey",
        "Survey mode should map to the survey subject",
    );
    assertEqual(
        getExecuteFlowSubject("audit"),
        "audit",
        "Audit mode should map to the audit subject",
    );
    assertEqual(
        getExecuteFlowSubject("both"),
        "auditAndSurvey",
        "Combined mode should map to the joint subject",
    );

    const sectionRows: ExecuteOverviewSectionInput[] = [
        {
            sectionKey: "one",
            title: "Section One",
            answeredCount: 4,
            totalCount: 4,
            isComplete: true,
        },
        {
            sectionKey: "two",
            title: "Section Two",
            answeredCount: 1,
            totalCount: 3,
            isComplete: false,
        },
        {
            sectionKey: "three",
            title: "Section Three",
            answeredCount: 0,
            totalCount: 2,
            isComplete: false,
        },
    ];

    assertDeepEqual(
        buildExecuteOverviewSummary(sectionRows),
        {
            completedCount: 1,
            incompleteCount: 2,
            firstIncompleteSectionKey: "two",
            rows: [
                {
                    sectionKey: "one",
                    title: "Section One",
                    answeredCount: 4,
                    totalCount: 4,
                    isComplete: true,
                },
                {
                    sectionKey: "two",
                    title: "Section Two",
                    answeredCount: 1,
                    totalCount: 3,
                    isComplete: false,
                },
                {
                    sectionKey: "three",
                    title: "Section Three",
                    answeredCount: 0,
                    totalCount: 2,
                    isComplete: false,
                },
            ],
        },
        "Execute overview summary should preserve rows and compute completion counts",
    );
}

main();
