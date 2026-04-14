import type { InstrumentTranslations } from "../../instrument-translations";

/**
 * Auto-generated translation overrides for the de instrument locale.
 *
 * Regenerate with `python3 scripts/translate_i18n.py --format instrument`.
 */
export const deInstrumentTranslations = {
    metadata: {
        instrumentName: "Audit-Tool fuer Spielwert und Nutzbarkeit von Spielplaetzen",
        currentSheet: "PVUA v5.2",
    },
    preamble: [
        "## Wie das Tool aufgebaut ist\nDas Playspace Play Value and Usability Audit Tool ist in 22 Bereiche gegliedert. Jeder Bereich umfasst zwischen 2 und 12 Items. Alle Items stehen für bestimmte Merkmale oder Eigenschaften der Umgebung.",
        "Jedes Item wird anhand von bis zu vier Skalen bewertet: Bereitstellung, Vielfalt, Herausforderungsmöglichkeiten und Unterstützung sozialer Interaktion. Nicht bei allen Items sind alle Skalen enthalten.",
        "### 1. Bereitstellung\nDie Bereitstellung wird immer zuerst beantwortet. Wenn die Antwort zur Bereitstellung eine Null-Antwort ist, wie z. B. Nein oder Nicht zutreffend, bleiben die übrigen Skalen ausgeblendet, da sie nicht relevant sind.",
        "### 2. Vielfalt\nVielfalt bewertet, ob die bereitgestellten Elemente eine Auswahl an Typen, Formen oder Möglichkeiten bieten. Mit anderen Worten: ob sie nicht alle gleich sind.\n\n**Leitfrage:** In welchem Maße wird die Vielfalt dieses Merkmals/dieser Umgebungs-eigenschaft berücksichtigt?\n\nBeispiel: Bei 5 Schaukeln: Sind sie alle unterschiedliche Typen (z. B. große Schaukel, Babyschaukel, Korbschaukel, Seilschaukel) oder sind sie alle identisch?\n\n**Es liegt in Ihrem Ermessen anzugeben, ob keine Vielfalt, etwas Vielfalt oder viel Vielfalt berücksichtigt wird. Sie können nur eine Option wählen!**",
        "### 3. Herausforderungsmöglichkeiten\nHerausforderungsmöglichkeiten bewerten, ob das Merkmal Möglichkeiten mit unterschiedlichen Schwierigkeitsgraden bietet.\n\n**Leitfrage:** In welchem Maße bietet dieses Merkmal/diese Umgebungs-eigenschaft unterschiedliche Schwierigkeitsgrade?\n\nBeispiel: Die vorhandenen Schaukeln sollten untersucht und bewertet werden, ob sie zunehmend herausfordernde Möglichkeiten bieten.\n\n**Es liegt in Ihrem Ermessen anzugeben, ob die vorhandenen Schaukeln unterschiedliche Schwierigkeitsgrade bieten. Sie können nur eine Option wählen!**",
        "### 4. Unterstützung sozialer Interaktion\nDie Unterstützung sozialer Interaktion bewertet, ob mehr als ein Kind/eine Person dieses Merkmal/diese Umgebungs-eigenschaft gemeinsam nutzen kann. Dabei wird berücksichtigt, ob das Merkmal von mehr als einer Person gleichzeitig, einzeln, in kleinen Gruppen oder in größeren Gruppen genutzt werden kann.\n\n**Leitfrage:** Können mehr als ein Kind (oder eine Person) dieses Merkmal gemeinsam nutzen?\n\nBeispiel: Können einige der Schaukeln allein genutzt werden? Können einige zu zweit genutzt werden? Können einige von Kindergruppen genutzt werden?\n\n**Es liegt in Ihrem Ermessen anzugeben, ob sie allein, zu zweit oder in Gruppen genutzt werden können.**",
        "## Offene Reflexion\nDie offene Frage gibt Ihnen die Möglichkeit, einige Überlegungen zu notieren. Eine Leitfrage fordert Sie auf, ein oder zwei Aspekte zu beschreiben, die Sie im Playspace ändern würden, um dessen Spielwert und Nutzbarkeit zu erhöhen.",
        "## Zwei Teile des Audits\nDas Playspace Play Value and Usability Audit Tool verwendet zwei Methoden zur Bewertung eines Playspaces:\n\n- **(A) Vor-Ort-Audit der physischen Umgebung**\nDieser Teil des Audits bewertet Aspekte des Playspaces, die nur vor Ort in der physischen Umgebung untersucht werden können.\nEr erfordert die physische Anwesenheit am Playspace.\n\n- **(B) Befragung zu ökologischen Aspekten des Playspaces**\nDieser Teil des Audits bewertet Informationen zur Geschichte, zu den Managementpraktiken und dazu, wie Wetter und Jahreszeiten die Nutzung des Playspaces beeinflussen.\nEr erfordert keine Anwesenheit vor Ort.\nEr muss von jemandem beantwortet werden, der mit dem Hintergrund und dem Kontext des Playspaces vertraut ist.",
        "## Bevor Sie fortfahren\nBevor Sie zum nächsten Abschnitt wechseln, müssen Sie entscheiden, welchen Teil bzw. welche Teile des Audits Sie ausfüllen werden: A, B oder A & B.\n\nIhre Wahl hängt davon ab, wie gut Sie mit dem Playspace vertraut sind und welche Rolle Sie haben.",
    ],
    executionModes: {
        both: {
            label: "Ich kenne den Spielplatz sehr gut und bin vor Ort.",
            description: "Beantworten Sie sowohl die Befragungs- als auch die Vor-Ort-Audit-Elemente.",
        },
        survey: {
            label: "Ich kenne den Spielplatz sehr gut, bin aber nicht vor Ort.",
            description: "Beantworten Sie nur die Elemente der Befragung.",
        },
        audit: {
            label: "Ich kenne den Spielplatz nicht gut, bin aber vor Ort.",
            description: "Beantworten Sie nur die Elemente des Vor-Ort-Audits.",
        },
    },
    preAuditQuestions: {
        auditor_code: {
            label: "Auditor-ID",
        },
        audit_date: {
            label: "Datum des Audits",
            options: {},
            description: "Wird automatisch erstellt, wenn die Auditsitzung angelegt wird.",
        },
        started_at: {
            label: "Startzeit des Audits",
            options: {},
            description: "Wird automatisch erstellt, wenn die Auditsitzung angelegt wird.",
        },
        submitted_at: {
            label: "Endzeit des Audits",
            options: {},
            description: "Wird automatisch erstellt, wenn das Audit eingereicht wird.",
        },
        total_minutes: {
            label: "Gesamtdauer in Minuten",
            description: "Wird automatisch aus Start- und Endzeit berechnet.",
            options: {},
        },
        place_size: {
            label: "Größe des Spielplatzes nach Ihrer Einschätzung",
            description: null,
            options: {
                small: {
                    label: "Klein",
                    description: null,
                },
                medium: {
                    label: "Mittel",
                    description: null,
                },
                large: {
                    label: "Groß",
                    description: null,
                },
                very_large: {
                    label: "Sehr groß",
                    description: "Mehr als 10 Aktivitätszonen; z. B. ein großer Ziel-Spielraum",
                },
            },
        },
        current_users_0_5: {
            label: "0–5 Jahre",
            options: {
                none: {
                    label: "Keine",
                },
                a_few: {
                    label: "Einige",
                },
                a_lot: {
                    label: "Viele",
                },
            },
        },
        current_users_6_12: {
            label: "6–12 Jahre",
            options: {
                none: {
                    label: "Keine",
                },
                a_few: {
                    label: "Einige",
                },
                a_lot: {
                    label: "Viele",
                },
            },
        },
        current_users_13_17: {
            label: "13–17 Jahre",
            options: {
                none: {
                    label: "Keine",
                },
                a_few: {
                    label: "Einige",
                },
                a_lot: {
                    label: "Viele",
                },
            },
        },
        current_users_18_plus: {
            label: "Erwachsene (18+ Jahre)",
            options: {
                none: {
                    label: "Keine",
                },
                a_few: {
                    label: "Einige",
                },
                a_lot: {
                    label: "Viele",
                },
            },
        },
        playspace_busyness: {
            label: "Wie stark frequentiert ist der Playspace derzeit?",
            options: {
                not_at_all_busy: {
                    label: "Überhaupt nicht stark frequentiert",
                },
                somewhat_busy: {
                    label: "Mäßig stark frequentiert",
                },
                very_busy: {
                    label: "Sehr stark frequentiert",
                },
            },
        },
        season: {
            label: "Aktuelle Jahreszeit",
            description: null,
            options: {
                spring: {
                    label: "Frühling",
                    description: null,
                },
                summer: {
                    label: "Sommer",
                    description: null,
                },
                autumn: {
                    label: "Herbst",
                    description: null,
                },
                winter: {
                    label: "Winter",
                    description: null,
                },
            },
        },
        weather_conditions: {
            label: "Wetterbedingungen zum Zeitpunkt des Audits",
            description: null,
            options: {
                full_sun: {
                    label: "Volle Sonne",
                },
                partial_sun_cloud: {
                    label: "Teilweise Sonne/Wolken",
                },
                cloudy_overcast: {
                    label: "Bewölkt/bedeckt",
                },
                foggy_misty: {
                    label: "Neblig/dunstig",
                },
                light_rain: {
                    label: "Leichter Regen",
                },
                moderate_rain: {
                    label: "Mäßiger Regen",
                },
                light_snow: {
                    label: "Leichter Schnee",
                },
                moderate_snow: {
                    label: "Mäßiger Schneefall",
                },
                sunshine: {
                    label: "Sonnig",
                    description: null,
                },
                cloudy: {
                    label: "Bewölkt",
                    description: null,
                },
                windy: {
                    label: "Windig",
                    description: null,
                },
                inclement_weather: {
                    label: "Schlechtes Wetter",
                    description: null,
                },
            },
        },
        wind_conditions: {
            label: "Aktuelle Windverhältnisse",
            options: {
                no_wind: {
                    label: "Kein Wind",
                },
                light_wind: {
                    label: "Leichter Wind",
                },
                occasional_gusts: {
                    label: "Gelegentliche Böen",
                },
                heavy_wind: {
                    label: "Starker Wind",
                },
            },
        },
        users_present: {
            label: "Nutzer auf dem Spielplatz zum Zeitpunkt des Audits",
            description: null,
            options: {
                none: {
                    label: "Keine",
                    description: null,
                },
                children: {
                    label: "Kinder",
                    description: null,
                },
                adults: {
                    label: "Erwachsene",
                    description: null,
                },
            },
        },
        user_count: {
            label: "Anzahl der Nutzer",
            description: null,
            options: {
                none: {
                    label: "Keine",
                    description: null,
                },
                some: {
                    label: "Einige",
                    description: null,
                },
                a_lot: {
                    label: "Viele",
                    description: null,
                },
            },
        },
        age_groups: {
            label: "Geschätzte Altersgruppen der Kinder auf dem Spielplatz",
            description: null,
            options: {
                under_5: {
                    label: "Unter 5 Jahren",
                    description: null,
                },
                age_6_10: {
                    label: "6 bis 10 Jahre",
                    description: null,
                },
                age_11_plus: {
                    label: "10+ Jahre",
                    description: null,
                },
            },
        },
    },
    scales: {
        quantity: {
            title: "Quantität",
            prompt: "In welcher Menge ist dieses Merkmal oder diese Umweltcharakteristik vorhanden?",
            description: "Quantität beschreibt, wie viele konkrete Angebote oder Umweltmerkmale vorhanden sind.",
            options: {
                no: {
                    label: "Nein",
                },
                some: {
                    label: "Einige",
                },
                a_lot: {
                    label: "Viele",
                },
                not_applicable: {
                    label: "Nicht zutreffend",
                },
            },
        },
        diversity: {
            title: "Vielfalt",
            prompt: "In welchem Maß ist Vielfalt bei diesem Merkmal oder dieser Umweltcharakteristik vorhanden?",
            description:
                "Vielfalt bewertet, ob die vorhandenen Angebote abwechslungsreich sind und nicht alle gleich ausfallen.",
            options: {
                not_applicable: {
                    label: "Nicht zutreffend",
                },
                no_diversity: {
                    label: "Keine Vielfalt",
                },
                some_diversity: {
                    label: "Etwas Vielfalt",
                },
                a_lot_of_diversity: {
                    label: "Viel Vielfalt",
                },
            },
        },
        challenge: {
            title: "Herausforderung",
            prompt: "In welchem Maß bietet dieses Merkmal oder diese Umweltcharakteristik unterschiedliche Schwierigkeitsstufen?",
            description:
                "Herausforderung bewertet, ob ein Merkmal Möglichkeiten mit unterschiedlichen Anforderungsniveaus bietet.",
            options: {
                not_applicable: {
                    label: "Nicht zutreffend",
                },
                no_challenge: {
                    label: "Keine Herausforderung",
                },
                some_challenge: {
                    label: "Etwas Herausforderung",
                },
                a_lot_of_challenge: {
                    label: "Viel Herausforderung",
                },
            },
        },
        sociability: {
            title: "Geselligkeit",
            prompt: "Kann dieses Merkmal gemeinsam von mehr als einem Kind oder einer Person genutzt werden?",
            description:
                "Geselligkeit betrachtet, ob ein Merkmal allein, zu zweit oder in größeren Gruppen genutzt werden kann.",
            options: {
                not_applicable: {
                    label: "Nicht zutreffend",
                },
                no: {
                    label: "Nein",
                },
                yes_a_pair: {
                    label: "Ja - zu zweit",
                },
                yes_more_than_two_children: {
                    label: "Ja - mit mehr als zwei Kindern",
                },
            },
        },
    },
    sections: {
        section_1_playspace_character_community: {
            title: "Spielplatzcharakter und Gemeinschaft",
            description:
                "Der Bereich „Spielplatzcharakter und Gemeinschaft“ beschreibt Aspekte eines Spielplatzs, die Benutzern helfen, eine Verbindung zum Spielplatz aufzubauen. Dazu gehoeren lokale Geschichte, Kulturerbe, Kunst oder Geschichten, Gemeinschaftsveranstaltungen auf dem Spielplatz sowie Aspekte der Gestaltung und Zielgruppenorientierung.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung des Charakters und der Einbindung der Gemeinschaft in diesen Spielplatz:",
            questions: {
                q_1_1: {
                    prompt: "wurde unter Einbeziehung von Nutzern des Spielplatzs (z. B. Kinder, Eltern, Gemeinschaftsorganisationen) entwickelt oder gestaltet.",
                },
                q_1_2: {
                    prompt: "wurde speziell entwickelt oder gestaltet, um einer oder mehreren bekanntermaßen unterversorgten Bevölkerungsgruppen wie Mädchen, Minderheiten oder Kindern mit unterschiedlichen Bedürfnissen Spielmöglichkeiten zu bieten",
                },
                q_1_3: {
                    prompt: "**spiegelt kulturelle und historische Aspekte der Gemeinschaft wider** (z. B. lokale Kunst, Geschichten oder Kulturerbe werden sichtbar; es werden Materialien aus der Region verwendet)",
                },
                q_1_4: {
                    prompt: "**hat** **einzigartige oder neuartige Aspekte/Möglichkeiten**, die ihn von anderen Spielplätzen unterscheiden (z. B. ein stark naturalisierter Spielplatz; Räume oder Merkmale, die von Kindern gestaltet und manipuliert werden können; skulpturale Spielmerkmale)",
                },
                q_1_5: {
                    prompt: "**ist** **besetzt mit Erwachsenen** **die aktiv das Spielen von Kindern ermöglichen** (z. B. neue Möglichkeiten in der Umgebung für neue/verändernde Spielformen bieten)",
                },
                q_1_6: {
                    prompt: "**bindet Nutzer** des Spielplatzs (Kinder und/oder Erwachsene) **in Wartungstaetigkeiten** ein (z. B. bei der Landschaftsgestaltung, beim Malen oder indem in der Naehe wohnende Erwachsene gebeten werden, den Spielplatz im Blick zu behalten)",
                },
                q_1_7: {
                    prompt: "**veranstaltet Gemeinschaftsveranstaltungen**",
                },
            },
        },
        section_2_playspace_location_connectivity: {
            title: "Standort und Konnektivität des Spielplatzs",
            description:
                "Spielplatzstandort und Konnektivität darüber, wie der Spielplatz in den Ort integriert ist, ob andere Spiel- und Freizeitmöglichkeiten verfügbar sind und wie Benutzer auf den Spielplatz zugreifen.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung des Standorts und der Konnektivität dieses Spielplatzs:",
            questions: {
                q_2_1: {
                    prompt: "ist **ueber Fuss- oder Radwege erreichbar**",
                },
                q_2_2: {
                    prompt: "ist mit öffentlichen Verkehrsmitteln erreichbar (z. B. gibt es an oder in der Nähe von mindestens einem Eingang eine Haltestelle für öffentliche Verkehrsmittel)",
                },
                q_2_3: {
                    prompt: "liegt **in der Naehe eines Wohngebiets** (innerhalb von 10 Minuten zu Fuss)",
                },
                q_2_4: {
                    prompt: "liegt in der Nähe von Schulen und/oder Kinderbetreuungseinrichtungen (innerhalb von 10 Minuten zu Fuß)",
                },
                q_2_5: {
                    prompt: "befindet sich in der Nähe oder in der Nähe anderer öffentlicher Einrichtungen, die für Kinder und Familien interessant/wichtig sein könnten (z. B. Parkfläche, Gemeindezentrum, Bibliothek, Einrichtungen, Treffpunkte für die Gemeinschaft, Museen, Gemeinschaftsgarten, Naturgebiete, Café).",
                },
                q_2_6: {
                    prompt: "ist in einen größeren naturalisierten Raum eingebettet oder mit diesem verbunden (z. B. Wald, Gehölz, großer Garten, Naturschutzgebiet)",
                },
                q_2_7: {
                    prompt: "liegt direkt neben Straßen mit starkem oder schnellem Verkehr und ohne klare/sichere Überquerungsmöglichkeiten. [Beachten Sie, dass dieser Punkt umgekehrt bewertet werden muss.]",
                },
                q_2_8: {
                    prompt: "liegt unmittelbar neben Straßen mit starkem oder schnellem Verkehr, ohne Einzäunung und ohne klare/sichere Querungsmöglichkeiten",
                },
            },
        },
        section_3_playspace_rules_restrictions: {
            title: "Regeln und Einschraenkungen des Spielplatzs",
            description:
                "Der Bereich „Regeln und Einschraenkungen“ prueft, ob Regeln und Einschraenkungen das Spielen im Freien behindern.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung der Regeln und Einschränkungen dieses Spielplatzes:",
            questions: {
                q_3_1: {
                    prompt: "**schränkt bestimmte Altersgruppen** vom Spielplatz aus (z. B. ältere Kinder, Jugendliche) [Dieser Punkt muss rückgängig gemacht werden]",
                },
                q_3_2: {
                    prompt: "**schränkt bestimmte Arten des Spielens oder Verhaltens ein** (z. B. laut sein, Ballspiel, Verwendung von Spielgeräten mit Rädern oder Schlitten) [Dieser Punkt muss rückgängig gemacht werden]",
                },
                q_3_3: {
                    prompt: "**schränkt den Zugang von Kindern ein, indem eine Aufsicht durch Erwachsene erforderlich ist** (d. h. die Aufsicht durch einen Betreuer ist nicht obligatorisch, außer vielleicht bei sehr kleinen Kindern; Kinder können den Spielplatz selbstständig nutzen) [Dieser Punkt muss rückgängig gemacht werden]",
                },
            },
        },
        section_4_playspace_information_wayfinding: {
            title: "Informationen und Wegweiser zum Spielplatz",
            description:
                "Information und Orientierung betrachten, wie sich Menschen auf dem Spielplatz zurechtfinden, wie leicht das Gelände zu navigieren ist und ob Hinweise zur Nutzung klar verfügbar sind.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung der Informationen und der Orientierung in diesem Spielplatz:",
            questions: {
                q_4_1: {
                    prompt: "verfügt über **Online-Informationen** zur Spielplatznutzung und -funktionen (z. B. Öffnungszeiten, Zugänglichkeit, Transportmöglichkeiten, Parkplätze)",
                },
                q_4_2: {
                    prompt: "verfuegt ueber ein **Layout, das einfach zu navigieren ist** (z. B. klare logische Hauptroute vom Eingang zum Ausgang; klar definierte Spielzonen)",
                },
                q_4_3: {
                    prompt: "verfuegt ueber barrierefreie Karten und/oder Beschilderungen an den Eingaengen zum Spielplatz, die Navigation und Nutzungshinweise bieten (z. B. in einer fuer Rollstuhlfahrer zugaenglichen Hoehe angebracht; Braille-Text, Piktogramme und/oder hoher Farbkontrast; Informationen ueber QR-Code verfuegbar)",
                },
                q_4_4: {
                    prompt: "verfuegt ueber kinderfreundliche, leicht lesbare oder verstaendliche Karten und/oder Beschilderungen an Eingaengen (z. B. in einer fuer kleine Kinder geeigneten Hoehe; mit einfacher Sprache, Symbolen und/oder Bildern)",
                },
                q_4_5: {
                    prompt: "verfuegt ueber **barrierefreie Karten und/oder Beschilderungen, die rund um den Spielplatz verteilt sind und Navigations- und Nutzungshinweise bieten** (z. B. auf einer fuer Rollstuhlfahrer zugaenglichen Hoehe angebracht; Brailleschrift, Piktogramme und/oder hoher Farbkontrast; Informationen ueber QR-Code verfuegbar)",
                },
                q_4_6: {
                    prompt: "verfuegt ueber **kinderfreundliche, leicht lesbare oder verstaendliche Karten und/oder Beschilderungen, die rund um den Spielplatz verteilt sind** (z. B. in einer fuer kleine Kinder geeigneten Hoehe; mit einfacher Sprache, Symbolen und/oder Bildern)",
                },
            },
        },
        section_5_management_maintenance: {
            title: "Verwaltung und Wartung",
            description:
                "Management und Wartung beschreiben Überlegungen, die für eine sichere und spielbare Umgebung sorgen.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung der Verwaltung und Wartung dieses Spielplatzs:",
            questions: {
                q_5_1: {
                    prompt: "über ein aktuelles Sicherheitszertifikat für Spielgeräte und/oder Spielflächen verfügt",
                },
                q_5_2: {
                    prompt: "ist im Allgemeinen in einem guten Zustand, mit wenigen bis gar keinen sichtbaren Gefahren wie kaputter oder beschädigter Ausrüstung/Oberfläche, Überreste entfernter Ausrüstung, morsches oder raues Holz, abblätternde Farbe",
                },
                q_5_3: {
                    prompt: "ist **größtenteils sauber** und gepflegt (z. B. wenig/keine Graffiti, Zigarettenkippen, Müll oder andere gefährliche Abfälle wie Glasscherben, Spritzen, Tierkot, überwucherte Pflanzen)",
                },
                q_5_4: {
                    prompt: "verfuegt ueber **genuegend Abfallbehaelter** im Verhaeltnis zur Groesse des Spielplatzs und in relevanten Bereichen (z. B. an oder in der Naehe von Einstiegspunkten sowie bei Tischen oder Sitzbereichen)",
                },
                q_5_5: {
                    prompt: "hat **durchdringende unangenehme Gerüche**, auch in geschlossenen Räumen (z. B. durch Tierkot, Rauch und/oder Müll) [Dieser Punkt muss rückgängig gemacht werden]",
                },
                q_5_6: {
                    prompt: "verfügt über **einen Lagerbereich** für lose Teile und/oder Mitfahrausrüstung",
                },
                q_5_7: {
                    prompt: "ist so angelegt und gepflegt, dass neue Möglichkeiten zum Spielen geboten werden (z. B. sind Tunnel in die Vegetation geschnitten; niedrige Äste und Felsbrocken bleiben zum Klettern übrig; es gibt Bereiche, in denen nicht gemäht werden darf; abgefallene Blätter/Blumen/kleine Äste werden absichtlich zum Spielen zurückgelassen; die Vegetation wird nicht übermäßig beschnitten)",
                },
            },
        },
        section_6_climate_protection_adaptability: {
            title: "Klimaschutz & Anpassungsfähigkeit",
            description:
                "Klima- und Wetterschutz betrachtet, wie gut der Spielplatz die Nutzung bei Sonne, Wind, Regen, Jahreszeitenwechsel und unterschiedlichen Lichtverhältnissen unterstützt.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen, um Klima- und Wetterschutz auf diesem Spielplatz zu verbessern:",
            questions: {
                q_6_1: {
                    prompt: "Bietet irgendwann im Laufe des Tages **Schatten oder Schutz** **für die meisten Sitzbereiche**",
                },
                q_6_2: {
                    prompt: "Bietet in den meisten primären Spielplatzen irgendwann im Laufe des Tages Schatten oder Schutz vor Sonne/schlechtem Wetter (z. B. durch Bäume/Vegetation, Gebäude, Schattenstrukturen oder Vordächer, Positionierung von Geräten).",
                },
                q_6_3: {
                    prompt: "ist so konzipiert und/oder instand gehalten, dass er durch die Platzierung von Merkmalen und/oder Landschaftsgestaltung (z. B. Windschutz durch immergrüne Bepflanzung) Schutz vor schlechtem Wetter/Sonne/Wind bietet.",
                },
                q_6_4: {
                    prompt: "verfügt über eine dem geografischen Standort und den örtlichen Gegebenheiten entsprechende Beleuchtung, um das Gefühl der Sicherheit zu gewährleisten und die Spielzeiten zu verlängern (z. B. Beleuchtung, die für die Wintermonate, Abende oder sich ändernde Wetterbedingungen geeignet ist, und/oder beleuchtete Wege in den Spielplatz).",
                },
                q_6_5: {
                    prompt: "verfuegt ueber eine **geeignete Entwaesserung, die Ueberschwemmungen oder grosse Mengen an stehendem oder stagnierendem Wasser verhindert**",
                },
            },
        },
        section_7_boundaries_entrances: {
            title: "Grenzen und Eingänge",
            description:
                "Der Bereich „Grenzen und Eingaenge“ betrachtet den Zugang zu und die Abgrenzung von Spielplaetzen. Grenzen sind klare Begrenzungen, die den Rand eines Bereichs markieren oder bestimmte Aktivitaetszonen definieren; dazu koennen Zaeune, Mauern oder Hecken gehoeren. Eingaenge sind die Stellen, an denen Menschen Spielplaetze oder Aktivitaetszonen betreten oder verlassen. Diese koennen formell sein, etwa Tore, oder informell, etwa Oeffnungen in Begrenzungen oder Veraenderungen der Bodenoberflaeche.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen, um Begrenzungen und Zugänge dieses Spielplatzes zu verbessern:",
            questions: {
                q_7_1: {
                    prompt: "verfuegt ueber Zaeune oder Abgrenzungen, um Spielplaetze von **erheblichen Gefahren** wie Strassenverkehr oder tiefem Wasser abzugrenzen",
                },
                q_7_2: {
                    prompt: "verfuegt ueber Zaeune oder Grenzen, die **visuell durchlaessig sind** und eine einfache Beobachtung oder Ueberwachung benachbarter Raeume ermoeglichen",
                },
                q_7_3: {
                    prompt: "Alle **Tore können problemlos von Erwachsenen** geöffnet werden (auch von Personen mit eingeschränkter Griffkraft oder von einem Rollstuhl/Mobilitätsgerät aus)",
                },
                q_7_4: {
                    prompt: "Alle Bereiche, die von Begrenzungen/Zäunen in voller Höhe umgeben sind, haben mehr als einen Ein-/Ausgang",
                },
            },
        },
        section_8_pathways: {
            title: "Wege",
            description:
                "Wege betrachten, wie sich Menschen durch den Spielplatz bewegen, einschließlich Zugänglichkeit, Belag, Routenführung, Breite und dem Spielwert der Wege selbst.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen, um die Wege dieses Spielplatzes zu verbessern:",
            questions: {
                q_8_1: {
                    prompt: "verfügt über Hauptwege, die vielfältige Fahr-/Lauf-/Geherlebnisse bieten (z. B. gerade und gewundene Wege oder Schleifen; Wege mit Wellen oder Unebenheiten; Wege, die durch Tunnel oder Gärten/Waldgebiete führen)",
                },
                q_8_2: {
                    prompt: "verfügt über primäre Wege, die zu jedem Spielplatz/zu jeder Spielfunktion führen, die **fest und ebenerdig** sind und allen Benutzern das Gehen/Laufen/Fahren (einschließlich Mobilitätshilfen) ermöglichen.",
                },
                q_8_3: {
                    prompt: "verfügt über Wege, die breit genug sind, damit mindestens zwei Personen nebeneinander fahren/laufen/gehen können",
                },
                q_8_4: {
                    prompt: "verfuegt ueber Nebenwege, die **neuartige Spielwege bieten** (z. B. aufgereihte Baumstuempfe, Trittsteine durch einen Garten oder Bach, ein Spielweg durch einen Weidentunnel oder eine Spielstruktur, ein in hohes Gras gemaehter Weg, ein Tunnel unter einem Huegel oder einer Boeschung oder ein sensorischer Oberflaechenpfad)",
                },
            },
        },
        section_9_open_space: {
            title: "Freiraum",
            description:
                "Ein offener Raum ist definiert als ein integrierter Bereich innerhalb oder um den Spielplatz herum ohne Spielelemente, andere bauliche Strukturen und ohne Bepflanzung. Freiflächen sind Mehrzweckflächen und werden flexibel genutzt und bieten vielfältige Möglichkeiten wie Laufen, Spazierengehen, Spielen mit losen Teilen (Bälle, Hula-Hoop-Reifen oder Naturelemente und andere), Sitzen oder Entspannen, Picknicken, Spielen in der Gruppe, …",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung der Freiflächen dieses Spielplatzs:",
            questions: {
                q_9_1: {
                    prompt: "verfügt über offene, überwiegend ebene Flächen (mit wenig bis gar keinem Gefälle), die vielfältige Spielmöglichkeiten wie Ball- oder Sportspiele, Gruppenspiele oder Versammlungen ermöglichen",
                },
                q_9_2: {
                    prompt: "Ein Teil der flachen, offenen Flächen verfügt über zugängliche Flächen, die die Nutzung von Rollstühlen oder Rollern ermöglichen",
                },
            },
        },
        section_10_enclosed_bounded_spaces: {
            title: "Geschlossene und begrenzte Räume",
            description:
                "Geschlossene und begrenzte Räume werden durch eine klare Grenze definiert und sind ganz oder teilweise umschlossen. Diese kommen in der natürlichen und gebauten Umwelt vor. Beispiele hierfür sind Nischen, Nischen, niedrige erhöhte Begrenzungen, die einen kleineren Raum umrahmen, Spielhütten, Höhlen, über dem Boden erhöhte kleine Räume usw.). Geschlossene und begrenzte Räume bieten Kindern die Möglichkeit, allein zu sein, mit einer kleinen Gruppe von Kindern zusammen zu sein, Kontakte zu knüpfen, das Gefühl zu haben, sich zu verstecken und fern von Erwachsenen zu sein oder sich fern von den Augen Erwachsener zu fühlen. Geschlossene und begrenzte Räume können kreatives und fantasievolles Spielen ermöglichen.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung der geschlossenen und begrenzten Räume dieses Spielplatzs:",
            questions: {
                q_10_1: {
                    prompt: "verfuegt ueber umschlossene oder begrenzte Raeume, die **ein Gefuehl der Eingeschlossenheit vermitteln** (z. B. hausartig oder raumartig) oder vollstaendig umschlossen sind (z. B. Spielhaeuser, Huetten oder Hoehlen, Baumhaeuser, kleine umschlossene Raeume in oder unter Baeumen oder Straeuchern sowie umschlossene oder begrenzte Raeume in Hoehe oder auf Bodenniveau)",
                },
                q_10_2: {
                    prompt: "verfügt über geschlossene oder abgegrenzte Räume, die auch die Möglichkeit bieten, herauszuschauen und zu beobachten, ohne von außen übermäßig sichtbar zu sein (z. B. Spielhaus mit kleinen Fenstern; Bootselement mit Bullaugen; Grashütte mit kleiner Türöffnung)",
                },
                q_10_3: {
                    prompt: "hat niedrige erhabene Grenzen/Kanten, die kleinere Räume definieren (z. B. kleine Nischen, Winkel, Ecken, unterteilte Sandgruben)",
                },
            },
        },
        section_11_sport_game_spaces: {
            title: "Sport- und Spielplätze",
            description:
                "Sport- und Spielplätze sind definierte Bereiche, die Kindern eine bestimmte Art von Spiel ermöglichen, beispielsweise Fußball, Basketball und (Tisch-)Tennis. Diese Sport- und Spielplatze sind teilweise vom Spielplatz getrennt. Wenn Sportbereiche in der Nähe des Spielplatzes liegen oder in diesen integriert sind, beziehen Sie diese in die Prüfung mit ein.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung der Sport- und Spielplatze dieses Spielplatzs:",
            questions: {
                q_11_1: {
                    prompt: "verfuegt ueber **Raeume, die Sport oder Spiele unterstuetzen koennen** (z. B. Fussballplaetze, Basketball- oder Tennisplaetze, Tischtennis oder Strassenspiele)",
                },
                q_11_2: {
                    prompt: "verfuegt ueber Sport- oder Spielflaechen mit **Oberflaechen, die fuer die beabsichtigten Aktivitaeten geeignet sind** (z. B. flache, offene Rasen- oder Gehwegflaechen fuer Fussball oder Basketball)",
                },
                q_11_3: {
                    prompt: "verfügt über Sport-/Spielflächen, die über **geeignete Ausrüstung oder Markierungen** für die Aktivität verfügen (z. B. Torpfosten, Basketballkörbe und -netze, Bodenmarkierungen für vier Quadrate oder Himmel und Hölle).",
                },
            },
        },
        section_12_manufactured_play_features: {
            title: "Hergestellte Spielfunktionen",
            description:
                "Hergestellte Spielelemente sind zum Spielen hergestellte Elemente, manchmal auch Spielgeräte oder Spielkomponenten genannt. Diese können aus verschiedenen Materialien wie Kunststoff, Material oder Holz hergestellt werden.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung der hergestellten Spielfunktionen dieses Spielplatzs:",
            questions: {
                q_12_1: {
                    prompt: "verfügt über nicht vorgeschriebene oder lose geformte Spielstrukturen/-merkmale, die Kindern die Möglichkeit bieten, ihre eigenen Spielideen zu entfalten (z. B. nur ein Rahmen; mehrdeutige Strukturen; skulpturale Elemente; thematische Spielstrukturen oder -merkmale)",
                },
                q_12_2: {
                    prompt: "hat Spielgeräte hergestellt, die Möglichkeiten zum Gleiten bieten (z. B. offene Rutsche, geschlossene Rutsche, Rohrrutsche, Feuerstange, Seilrutsche, Rollrutsche usw.)",
                },
                q_12_3: {
                    prompt: "hat Spielgeräte hergestellt, die das Klettern, Baumeln und/oder Hochziehen ermöglichen (z. B. Turnringe, Klimmzugstange, Felswand, Klettergerüst, Leiter).",
                },
                q_12_4: {
                    prompt: "hat Spielfunktionen entwickelt, die **drehen/drehen** ermöglichen (z. B. Spinner, Karussell, kurvenreiche Rutsche, Schaukeln, die sich drehen können).",
                },
                q_12_5: {
                    prompt: "hat Spielgeräte hergestellt, die das Balancieren auf oder quer ermöglichen (z. B. Schwebebalken oder Baumstämme, Wackelbrett, wackelige Brücken, Balancierseile, schmale Plattformen).",
                },
                q_12_6: {
                    prompt: "hat Spielgeräte hergestellt, die **schaukeln** ermöglichen (z. B. eine Wippe/Kippsäge; Federwippe)",
                },
                q_12_7: {
                    prompt: "hat Spielfunktionen entwickelt, die das Krabbeln im, auf oder durch ermöglichen (z. B. Krabbelnetz, Tunnel).",
                },
                q_12_8: {
                    prompt: "hat Spielgeräte hergestellt, die es ermöglichen, darauf zu hüpfen oder darauf zu springen (z. B. Trampolin, Podium, Parkour-Elemente).",
                },
                q_12_9: {
                    prompt: "hat Spielfunktionen hergestellt, die eine Manipulation durch Schieben, Schieben, Drehen, Öffnen und/oder Schließen von Dingen ermöglichen (z. B. Lenkrad, bedienbare Fenster oder Türen, Spieltafel, Pumpe, Flaschenzug, Musik-/Tongeräte).",
                },
                q_12_11: {
                    prompt: "hat Spielelemente entwickelt, die so ausgerichtet und/oder verbunden sind, dass Spielrouten über ein oder mehrere Elemente hinweg möglich sind (z. B. ein eingebetteter Hindernisparcours; Elemente, die nahe genug beieinander platziert sind, um das Spielen über mehrere Elemente hinweg zu erleichtern).",
                },
                q_12_12: {
                    prompt: "verfügt über mehrere Zu- und Abgänge zu großen Spielstrukturen (z. B. Rampen, Stufen, Kletternetz/Kletterwand, Böschungszugang)",
                },
            },
        },
        section_13_natural_play_features: {
            title: "Natürliche Spielfunktionen",
            description:
                "Natürliche Spielelemente können sich entweder im Spielplatz befinden oder den Spielplatz umgeben. Zu den natürlichen Umgebungen gehören Vegetation, Sträucher, hohes Gras, Bereiche mit Bäumen, Büschen, Felsbrocken und Felsen. Natürliche Merkmale bieten vielfältige Spielmöglichkeiten, darunter körperliches aktives Spielen (z. B. Klettern), Erkunden, sensorisches Spielen, Manipulieren und Kreieren eines eigenen Spiels (z. B. soziodramatisches Spiel oder Fantasie), Ausruhen, Alleinsein oder Treffen mit anderen Kindern.",
            instruction:
                "Wichtig: Dieses Audit konzentriert sich auf natürliche Spielfunktionen, die zum Spielen bereitgestellt und gedacht sind, nicht auf Elemente, die den Ort nur natürlich aussehen lassen (zum Beispiel Bäume, die nur Schatten spenden, aber nicht zum Klettern gedacht sind). Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung der natürlichen Spielfunktionen dieses Spielplatzs:",
            questions: {
                q_13_1: {
                    prompt: "verfuegt ueber **grossflaechige Vegetation, die zum Spielen geeignet und zugaenglich ist** (z. B. Baeume, grosse Straeucher oder Hecken sowie nicht zu stark beschnittene Baeume)",
                },
                q_13_2: {
                    prompt: "verfügt über kleinräumige Vegetation, die zum Spielen geeignet und zugänglich ist (z. B. kleinere Sträucher/Hecken; hohe Gräser; Blumenbeete mit Wegen; Mähverbotsfläche)",
                },
                q_13_3: {
                    prompt: "hat **dichtere oder höhere Vegetation**, die ein spielerisches Verstecken darin/darunter oder das Finden eines „geheimen Ortes“ oder das Gefühl des Erkundens oder des „Verlorengehens“ ermöglicht (z. B. langes Graslabyrinth, niedrig hängende Vordächer, dichte Hecken, belaubter Kletterbaum)",
                },
                q_13_4: {
                    prompt: "hat **erhoehte natuerliche Merkmale**, die das Klettern, Sitzen, Springen usw. ermoeglichen (z. B. mittelgrosse bis grosse Felsbrocken oder umgestuerzte Baeume bzw. Baumstaemme)",
                },
            },
        },
        section_14_loose_manufactured_parts_equipment: {
            title: "Lose hergestellte Teile und Ausrüstung",
            description:
                "Bei lose hergestellten Teilen und Geräten handelt es sich um von Menschenhand hergestellte Spielgegenstände, die manchmal auf dem Spielplatz bereitgestellt, aber manchmal mitgebracht werden (z. B. lose geformte lose Teile, Gokarts, Roller, Fahrräder, Bälle/Frisbees oder anderes Spielzeug, Sand-/Schlamm-/Wasserspielspielzeug).",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung der lose gefertigten Teile und Geräte dieses Spielplatzs:",
            questions: {
                q_14_1: {
                    prompt: "verfügt über **kleine, hergestellte lose Teile**, die **leicht und leicht zu bewegen/handhaben** sind, einschließlich solcher, die zur Manipulation formbarer Materialien und anderer loser Teile verwendet werden können (z. B. Tassen, Eimer, Schaufeln, kleine Werkzeuge, Trichter, Bälle, leichte Seile, Stoffe, Bälle, Frisbees-Hula-Hoops, Schläger, Spielzeugautos/-boote, Puppen).",
                },
                q_14_1_1: {
                    prompt: "Prüfen Sie alle kleinen losen, hergestellten Teile in diesem Spielbereich",
                },
                q_14_2: {
                    prompt: "hat **mittelgrosse hergestellte lose Teile, die etwas schwerer, aber dennoch relativ leicht zu bewegen oder zu handhaben sind** (z. B. Kisten, Baukegel, Toepfe und Pfannen, Kunststoff- oder PVC-Rohre, groessere Bausteine, Werkzeuge, groessere Schaufeln oder Rechen sowie schwere Seile)",
                },
                q_14_2_1: {
                    prompt: "Prüfen Sie alle mittelgroßen losen, hergestellten Teile in diesem Spielbereich",
                },
                q_14_3: {
                    prompt: "hat **grosse hergestellte lose Teile, die schwerer sind und bei deren Bewegung oder Handhabung Hilfe erfordern koennten** (z. B. Reifen, Baumstuempfe, grosse Bloecke oder Bretter, Tische oder Stuehle sowie bewegliche Klettergeraete)",
                },
                q_14_3_1: {
                    prompt: "Prüfen Sie alle großen losen, hergestellten Teile in diesem Spielbereich",
                },
                q_14_4: {
                    prompt: "verfügt über **(fahrbare) Aufsitzgeräte**, mit denen sich Kinder im Raum/auf den Wegen fortbewegen können (z. B. Roller, Fahrräder oder Dreiräder, Kinderwagen, Skateboards, Schlitten/Rodel)",
                },
                q_14_4_1: {
                    prompt: "Prüfen Sie alle befahrbaren Geräte (mit Rädern) in diesem Spielbereich",
                },
            },
        },
        section_15_loose_natural_parts_malleable_materials: {
            title: "Lose Naturteile und formbare Materialien",
            description:
                "Zu den losen Naturteilen und formbaren Materialien zählen Materialien wie Erde, Schlamm, Sand, Wasser oder alle Naturteile wie Blätter, Blumen, Stöcke, Steine, Zapfen und andere. Natürliche lose Teile ermöglichen Kindern das Sammeln, Ordnen, Gestalten, Bauen, Graben, Mischen, Erkunden und werden in soziodramatischen und kreativen Spielen eingesetzt. Materialien bieten sensorische Möglichkeiten und zum Mischen, Graben, Transportieren, Füllen und Entleeren, Bauen, …",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung der losen Naturteile und formbaren Materialien dieses Spielplatzs:",
            questions: {
                q_15_1: {
                    prompt: "verfuegt ueber **natuerliche formbare Materialien** (z. B. Sand, Kies oder Kiesel, Mulch, Erde, Schlamm, Wasser oder Schnee)",
                },
                q_15_1_1: {
                    prompt: "Prüfen Sie alle natürlichen formbaren Materialien in diesem Spielbereich",
                },
                q_15_2: {
                    prompt: "In Räumen, in denen formbare Materialien verfügbar sind, sind **natürliche oder hergestellte lose Teile vorhanden** (z. B. Eimer/Schaufeln oder Stöcke in Sandbereichen; Töpfe, Schüsseln und Löffel im Schlammbereich/in der Küche)",
                },
                q_15_3: {
                    prompt: "verfuegt ueber **kleine natuerliche lose Teile, die leicht zu bewegen oder zu handhaben sind** (z. B. Blaetter, Rinde oder Mulch, Tannenzapfen, Samen, Stoecke oder kleine Zweige, Fruechte, Muscheln, Blumen oder Schneebaelle)",
                },
                q_15_3_1: {
                    prompt: "Prüfen Sie alle kleinen losen Naturmaterialien in diesem Spielbereich",
                },
                q_15_4: {
                    prompt: "hat **mittelgroße natürliche lose Teile, die etwas schwerer** sind, aber dennoch relativ leicht zu bewegen/handhaben (z. B. Baumkekse; handtellergroße Steine; kleine Baumstümpfe; größere Bänke; Eisbrocken)",
                },
                q_15_4_1: {
                    prompt: "Prüfen Sie alle mittelgroßen losen Naturmaterialien in diesem Spielbereich",
                },
                q_15_5: {
                    prompt: "hat **größere natürliche lose Teile, die schwerer** sind und möglicherweise Hilfe beim Bewegen/Handhaben benötigen (z. B. Holzstämme; große Äste; schwerere Steine; große Baumstümpfe)",
                },
                q_15_5_1: {
                    prompt: "Prüfen Sie alle großen losen Naturmaterialien in diesem Spielbereich",
                },
                q_15_6: {
                    prompt: "Kindern ist es **erlaubt, lose Teile und/oder formbare Materialien zusammen zu verwenden oder sie von einer Spielzone in eine andere zu bewegen**",
                },
            },
        },
        section_16_seating: {
            title: "Sitzplätze",
            description:
                "Sitzgelegenheiten sind ein tragendes Element von Spielplätzen. Formellere Sitzgelegenheiten könnten eher von Erwachsenen genutzt werden, die Kinder beaufsichtigen möchten. Informellere Sitzgelegenheiten können von Kindern zum Ausruhen, Sitzen, Beobachten anderer, zum Verweilen oder zum geselligen Beisammensein mit Gleichaltrigen genutzt werden, ermöglichen aber auch die Entwicklung kreativer und fantasievoller Spiele (Beispiele für informelle Sitzgelegenheiten: Plattformen, Baumstämme, Baumstümpfe, Stufen, niedrige erhöhte Begrenzungen, Steine, Picknicktische, Sitzgelegenheiten in kleineren Räumen und in der Natur …)",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung der Sitzgelegenheiten in diesem Spielplatz:",
            questions: {
                q_16_1: {
                    prompt: "Bietet Möglichkeiten zum Sitzen durch formelle Sitzgelegenheiten (z. B. Stühle, Bänke, Hocker, Picknicktische) und/oder informelle Sitzgelegenheiten (z. B. Plattformen/Vorsprünge, Baumstümpfe, Baumstämme, Felsbrocken, niedrige erhöhte Mauern).",
                },
                q_16_1_1: {
                    prompt: "Prüfen Sie die von Ihnen identifizierten formellen Sitzgelegenheiten",
                },
                q_16_2: {
                    prompt: "Zur einfachen Beobachtung (durch Betreuer oder andere Kinder) stehen Sitzgelegenheiten innerhalb oder an den Rändern der primären Spielplatze zur Verfügung.",
                },
                q_16_2_1: {
                    prompt: "Prüfen Sie die von Ihnen identifizierten informellen Sitzgelegenheiten",
                },
                q_16_3: {
                    prompt: "Sitzgelegenheiten sind im gesamten Spielplatz verteilt (z. B. in kleinen Räumen, in Naturbereichen, innerhalb von Spielstrukturen oder -einrichtungen).",
                },
                q_16_4: {
                    prompt: "Es gibt Sitzgelegenheiten, die die Möglichkeit bieten, in kleinen und größeren Gruppen zusammenzusitzen und zusammenzukommen (z. B. eine Bank für 2–3 Personen, ein Amphitheater, einen Pavillon, Picknicktische).",
                },
                q_16_5: {
                    prompt: "Es gibt **Sitzgelegenheiten, die dazu dienen, soziale Interaktionen zu foerdern** (z. B. kreisfoermig angeordnet, in unmittelbarer Naehe zueinander angeordnet, Picknicktische oder ein Amphitheater)",
                },
                q_16_6: {
                    prompt: "verfügt über zugängliche Tische und/oder Sitzgelegenheiten (z. B. Sitze mit Rückenlehnen und/oder Armlehnen; Platz unter Tischen für Rollstühle; ermöglicht den Transfer vom Mobilitätsgerät zum Sitzplatz; feste Oberfläche neben anderen Sitzgelegenheiten für Mobilitätsgeräte/Kinderwagen)",
                },
                q_16_7: {
                    prompt: "Es gibt hergestellte Spielelemente, die das Liegen oder Sitzen ermöglichen (z. B. bequemes Netz, Hängematte, integrierte Sitzgelegenheiten in der Struktur, Plattformen).",
                },
            },
        },
        section_17_amenities: {
            title: "Ausstattung",
            description:
                "Annehmlichkeiten sind unterstützende Merkmale eines Spielplatzes und tragen dazu bei, den Spielplatz attraktiver und komfortabler zu machen, insbesondere für Familien, Kinder mit Behinderungen und Mädchen.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung der Annehmlichkeiten dieses Spielplatzs:",
            questions: {
                q_17_1: {
                    prompt: "verfuegt ueber **saubere, regelmaessig gewartete Toiletten, die kostenlos und waehrend der Oeffnungszeiten des Spielplatzes fuer die Oeffentlichkeit zugaenglich sind**",
                },
                q_17_2: {
                    prompt: "verfügt über mindestens eine Toilette (in jedem Geschlechterblock, sofern getrennt), die zugänglich und für alle Benutzer geeignet ist (z. B. für Benutzer von Mobilitätsgeräten; groß genug für zwei Personen; Wickeltisch für Babys und/oder Erwachsene mit Transfersystem)",
                },
                q_17_3: {
                    prompt: "verfügt über intuitiv zu bedienende Trinkwasserbrunnen oder Tankstellen, die in zugänglicher Höhe oder/oder in verschiedenen Höhen auf einer zugänglichen Fläche bereitgestellt werden",
                },
            },
        },
        section_18_topography_surfaces: {
            title: "Topographie und Oberflächen",
            description:
                "Topographie und Oberflächen werden als Hügel, Hänge, Senken und Stufen im Gelände identifiziert. Sie ermöglichen abwechslungsreiche Spielmöglichkeiten wie Laufen, Herunterrollen, Herunterrollen, Fahren, Klettern, Balancieren, Rodeln, Rutschen, Ausblick genießen und Höhen erleben, Springen/Tauchen/in/über Pfützen rollen, …)",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung der Topographie und Oberflächen dieses Spielplatzs:",
            questions: {
                q_18_1: {
                    prompt: "hat eine Topographie, die Unterschiede in Neigung, Neigung und/oder Höhe bietet (z. B. Hügel, Hügel, Senken, Täler, Bergrücken)",
                },
                q_18_2: {
                    prompt: "verfügt über Bodenflächen, die verschiedene Arten von Spielmöglichkeiten bieten (z. B. Gras, Asphalt/Beton, Gummi, Erbsenkies, Mulch)",
                },
                q_18_3: {
                    prompt: "verfügt über Steigungen oder Gefälle mit weicheren Oberflächen (z. B. Gras, Sand, Rasen), die ein bequemes Herunterrutschen/Rollen Ihres Körpers ermöglichen",
                },
                q_18_4: {
                    prompt: "hat Steigungen oder Gefälle mit härteren/kompakteren Oberflächen (z. B. Gummi, Asphalt), die das Herunterfahren mit Rädern (z. B. Fahrrad, Roller, Skateboard) oder das Herunterrutschen (z. B. mit Schlitten, Untertasse, Schlauch) ermöglichen.",
                },
                q_18_5: {
                    prompt: "verfügt über eine Topografie, die unebene Oberflächen/Gelände zum Klettern oder Balancieren bietet (z. B. große Felsbrocken, Steinbach, Baumstumpf oder Steintreppe, Buckelpisten, Holzvorsprünge als Begrenzungen, erhöhte Bretter, die Spielplatze anzeigen).",
                },
                q_18_6: {
                    prompt: "verfügt über Funktionen, die Vertiefungen bieten, in denen möglicherweise Wasser/Schnee/Blätter zum Spielen gesammelt werden können (z. B. Regenkanäle, Bäche, Senken oder konkave Vertiefungen).",
                },
            },
        },
        section_19_novelty: {
            title: "Neuheit",
            description:
                "Neuheit betrachtet, ob der Spielplatz überraschende, sich verändernde, erkundbare oder ungewöhnliche Erfahrungen bietet, die das Spielen über längere Zeit interessant halten.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen, um die Neuheit dieses Spielplatzs zu verbessern:",
            questions: {
                q_19_1: {
                    prompt: "verfuegt ueber Funktionen, die dank **wetterabhaengiger Elemente** immer neue Spielmoeglichkeiten bieten (z. B. Glocken oder Trommeln, die durch Wind oder Regen aktiviert werden, Gefaelle, die nach Regenfaellen voruebergehende Pfuetzen bilden, trockene Bachbetten, die sich waehrend oder nach Niederschlaegen veraendern, sowie Huegel und Haenge, die nach Schneefall zum Rutschen oder Rodeln geeignet sind)",
                },
                q_19_2: {
                    prompt: "verfügt über Funktionen, die sich entwickelnde Spielmöglichkeiten aufgrund lokaler saisonaler Veränderungen bieten (z. B. Laubbäume, die ihre Farbe ändern; Bäume, die ihre Blätter/Samen verlieren (z. B. Eicheln); Obstbäume wie Kastanien/Äpfel; blühende Pflanzen; Teiche, die im Winter zufrieren; Gärten mit saisonalen Früchten und Kräutern).",
                },
                q_19_3: {
                    prompt: "verfügt über Funktionen, die Sonnenlicht, wechselndes natürliches Licht und/oder elektronische Beleuchtung nutzen und durch auf Licht reagierende Funktionen sensorische und Spielmöglichkeiten schaffen (z. B. Buntglasplatten, beleuchtete Funktionen, Funktionen, die gemusterte oder sich bewegende Schatten erzeugen).",
                },
                q_19_4: {
                    prompt: "verfügt über interaktive und/oder sensorbasierte Funktionen, die Kinder aktivieren können, um die Spielumgebung zu verändern oder zu gestalten (z. B. Materialmischungselemente wie Wasserpumpen; bewegungs- oder timeraktivierte Ton-/Licht-/Wasserfunktionen).",
                },
                q_19_5: {
                    prompt: "verfügt über Funktionen, die es Kindern ermöglichen, verschiedene Höhen zu erleben, darunter auch große Höhen (z. B. „großer“ Hügel, Turm oder Aussichtspunkt, hohe Rutsche, Kletterwand, besteigbare Bäume).",
                },
                q_19_6: {
                    prompt: "verfügt über interne oder externe Grenzen/Kanten um Spielplatze mit eingebetteten Spielmöglichkeiten (z. B. spielbare Hecke; Baumstümpfe/Steine, die sich um einen Spielplatz winden und das Springen/Laufen ermöglichen; interaktive Funktionen oder Guck-Öffnungen in Zäunen/Raumteilern)",
                },
                q_19_7: {
                    prompt: "verfügt über Funktionen, die geeignete Wildtiere anlocken (z. B. blühende Pflanzen, die Insekten anlocken; Futterhäuschen für Vögel, Schmetterlingshäuser oder Insektenhotels; Vertiefungen in Felsen, die zu temporären Vogelbädern werden können; hebbare Steine, um Insekten und Würmer zu finden)",
                },
                q_19_8: {
                    prompt: "verfügt über Funktionen, die **zu Erkundungen anregen oder dazu einladen** (z. B. Räume/Öffnungen, in die oder hinter die man schauen kann; Tunnel oder Pfade mit versteckten Enden; Guck-Guck-Elemente; Sound/Musik, die zum Entdecken anregt)",
                },
            },
        },
        section_20_sensory_qualities_regulation: {
            title: "Sinnesqualitaeten und Reizregulation",
            description:
                "Der Bereich „Sinnesqualitaeten und Reizregulation“ bewertet, wie gut ein Raum vielfaeltige Sinneserlebnisse unterstuetzt, die Engagement, Komfort und Wohlbefinden steigern. Beruecksichtigt werden visuelle, akustische, olfaktorische und taktile Elemente, die Interesse und Stimulation erzeugen, etwa Farbakzente, unterschiedliche Texturen, Geraeusche, angenehme Gerueche und interaktive Funktionen. Ausserdem wird beurteilt, ob die Umgebung Rueckzugsmoeglichkeiten mit reduzierter Stimulation bietet und ob eine anhaltende Laermbelastung vorliegt (umgekehrt kodiert), damit der Raum Menschen mit unterschiedlichen sensorischen Beduerfnissen unterstuetzt.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung der sensorischen Qualitäten dieses Spielplatzs:",
            questions: {
                q_20_1: {
                    prompt: "hat **Farbe auf eine Weise integriert, die visuelles Interesse** weckt (z. B. farbige Spielelemente oder Akzente; Kunst; blühende Pflanzen)",
                },
                q_20_2: {
                    prompt: "bietet **andere Formen visuellen Interesses** durch unterschiedliche Muster, Texturen, Licht oder Bewegung (z. B. Bodenmarkierungen, Spiegel oder reflektierende Oberflaechen, Skulpturen oder kuenstlerische Elemente sowie vielfaeltige Vegetation)",
                },
                q_20_3: {
                    prompt: "hat Vegetation, die angenehme Gerüche verströmt (z. B. Blumen, Kräuter, Obstpflanzen oder Bäume, Lavendelsträucher, Eukalyptusbäume)",
                },
                q_20_4: {
                    prompt: "bietet Möglichkeiten, Geräusche zu erleben oder zu erzeugen (z. B. Musikinstrumente, bewegungs-/gewichtsaktivierte Klanggeräte, Windspiele, sprechende Röhren, fließendes Wasser, Tiergeräusche, raschelnde Gräser).",
                },
                q_20_5: {
                    prompt: "Bietet taktile Erlebnisse durch verschiedene Texturen, Materialien und/oder Vibrationen (z. B. Sand- oder Schlammspiel, Vegetation mit weicher Textur, vibrierende Musikelemente).",
                },
                q_20_6: {
                    prompt: "verfügt über Orte für den Rückzug oder Rückzug von Sinnesreizen (z. B. kleine oder geschlossene Räume; naturreiche Bereiche; isolierte ruhige Räume; ruhige/passive Zonen, die von lauten/aktiven Zonen getrennt sind)",
                },
                q_20_7: {
                    prompt: "hat **anhaltende Lärmbelästigung** (z. B. durch starken Verkehr, Züge oder laute Musik; allgegenwärtige Winde; unvorhersehbare Geräusche) [dieses Element muss codiert werden]",
                },
            },
        },
        section_21_accommodating_diverse_abilities: {
            title: "Berücksichtigung unterschiedlicher Fähigkeiten",
            description:
                "Die Berücksichtigung unterschiedlicher Fähigkeiten betrachtet, wie gut ein Spielplatz Kinder mit verschiedenen körperlichen, sensorischen und kommunikativen Bedürfnissen unterstützt. Bewertet werden Zugänglichkeit, Nutzbarkeit, Kommunikationshilfen, Übergänge und inklusive Teilhabe über ein breites Spektrum von Fähigkeiten hinweg.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung dieses Spielplatzs für unterschiedliche Altersgruppen und Fähigkeiten.",
            questions: {
                q_21_1: {
                    prompt: "verfügt über ausgewiesene **zugängliche Parkplätze** (für Kraftfahrzeuge und/oder Fahrräder)",
                },
                q_21_2: {
                    prompt: "verfuegt ueber digitale oder analoge Kommunikationstafeln, die Kindern helfen, ihre Beduerfnisse und Wuensche auszudruecken (die Kommunikationstafel sollte die auf dem Spielplatz verfuegbaren Spielmoeglichkeiten und Annehmlichkeiten widerspiegeln)",
                },
                q_21_3: {
                    prompt: "verfügt über zugängliche Kanten oder Zugangspunkte (bündig oder rampenförmig) vom Hauptweg zu zugänglichen Spielflächen oder direkt zu Spielmerkmalen.",
                },
                q_21_4: {
                    prompt: "verfügt über barrierefreie Spieleinrichtungen, die von anderen Spielplatzen oder hinter Zäunen oder Sichtbarrieren (z. B. eingezäunte Rollstuhlschaukeln) isoliert sind [muss umgekehrt kodiert werden]",
                },
                q_21_5: {
                    prompt: "Spielfunktionen unterstuetzen **den Ein- und Ausstieg** (z. B. Ein- oder Ausstiegsrampen, ausreichend Platz und/oder Plattformen fuer den Transfer von einem Mobilitaetsgeraet oder Rutschen mit verlaengerten Auslaeufen fuer einen einfacheren Transfer)",
                },
                q_21_6: {
                    prompt: "Spielelemente verfügen über **Handläufe und Griffe, die bei Übergängen** **und Stabilität** helfen und für Kinder mit unterschiedlichen Fähigkeiten einfach zu verwenden sind (z. B. in verschiedenen Höhen angebracht; in Größen und Formen, die für unterschiedlich große Hände geeignet sind).",
                },
                q_21_7: {
                    prompt: "Spielfunktionen ermöglichen die Nutzung aus unterschiedlichen Körperpositionen und bieten so eine angemessene Unterstützung für Kinder mit unterschiedlichen Bedürfnissen (z. B. Sitz-, Steh- oder Liegemöglichkeiten; Sitze oder Schaukeln mit Ganzkörperunterstützung, breite Untergestelle und/oder sichere Gurte; Fußstützen, damit die Füße nicht baumeln müssen)",
                },
                q_21_8: {
                    prompt: "hat **zugänglichen Zugriff auf die höchsten Punkte** und/oder die „coolsten“ oder einzigartigsten Spielfunktionen",
                },
                q_21_9: {
                    prompt: "verfügt über klare, taktile und/oder visuelle Indikatoren (z. B. Farbkontraste, Materialveränderungen oder strukturierte/geriffelte Oberflächen, niedrige erhöhte Grenzen), um Wegeränder zu definieren oder signifikante Höhenänderungen (z. B. Kanten einer erhöhten Plattform) oder Übergänge in neue Räume (z. B. in die Schaukelbereiche) zu signalisieren.",
                },
                q_21_10: {
                    prompt: "verfügt über klare taktile und/oder visuelle Markierungen (z. B. Farbkontraste; Materialwechsel; strukturierte oder genoppte Oberflächen; niedrige, erhabene Begrenzungen), um Kanten von Wegen zu definieren, erhebliche Höhenänderungen anzuzeigen oder Übergänge in neue Bereiche zu kennzeichnen",
                },
            },
        },
        section_22_playspace_suitability_for_diverse_users: {
            title: "Spielplatzeignung für verschiedene Benutzer",
            description:
                "Bei der Spielplatzeignung für unterschiedliche Nutzer wird beurteilt, wie gut der Spielplatz so gestaltet ist, dass er den Bedürfnissen von Kindern aller Altersgruppen und Fähigkeiten gerecht wird.",
            instruction: "Lesen Sie jede Aussage und beantworten Sie die Fragen. Dieser Spielplatz...",
            notesPrompt:
                "Irgendwelche Kommentare? Beschreiben Sie eine oder mehrere Empfehlungen zur Verbesserung dieses Spielplatzs für unterschiedliche Altersgruppen und Fähigkeiten.",
            questions: {
                q_22_1: {
                    prompt: "erfüllt die Bedürfnisse von **Kindern im Alter von 0-5 Jahren**",
                },
                q_22_2: {
                    prompt: "erfüllt die Bedürfnisse von **Kindern im Alter von 6-12 Jahren**",
                },
                q_22_3: {
                    prompt: "erfuellt die Beduerfnisse von **Kindern ab 13 Jahren**",
                },
                q_22_4: {
                    prompt: "dient den Bedürfnissen von **Kindern mit körperlichen Behinderungen** (z. B. Kinder, die Mobilitätshilfen wie Gehhilfen und Rollstühle nutzen, Kinder mit eingeschränkter Muskelkraft, ...)",
                },
                q_22_5: {
                    prompt: "dient den Bedürfnissen von Kindern mit Sehbehinderungen, einschließlich Blindheit und Sehbehinderung.",
                },
                q_22_6: {
                    prompt: "dient den Bedürfnissen gehörloser oder schwerhöriger Kinder (z. B. Kinder, die Hörgeräte oder Implantate tragen, Kinder mit Hörverlust).",
                },
                q_22_7: {
                    prompt: "dient den Bedürfnissen von **Kindern mit geistigen und entwicklungsbedingten Behinderungen** (z. B. Lern- oder kognitive Unterstützungsbedürfnisse).",
                },
            },
        },
    },
} satisfies InstrumentTranslations;
