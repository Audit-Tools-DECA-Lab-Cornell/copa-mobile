import type { InstrumentTranslations } from "../../instrument-translations";

export const enInstrumentTranslations: InstrumentTranslations = {
    metadata: {
        instrumentName: "Comprehensive Outdoor Playspace Audit (COPA) Tool",
        currentSheet: "PVUA v5.2",
    },
    preamble: [
        "## How the tool is structured\nThe Comprehensive Outdoor Playspace Audit (COPA) Tool is structured in 22 domains. Each domain has between 2 and 12 items. All items represent specific features or characteristics of the environment.",
        "Each item is assessed through up to four scales: Provision, Diversity, Challenge Opportunities, and Sociability Support. Not all items include every scale.",
        "### 1. Provision\nProvision is always answered first. When the provision answer is a zero-like response such as No or Not applicable, the remaining scales stay hidden because they do not apply.",
        "### 2. Diversity\nDiversity evaluates whether the provided items offer a variety of types, forms, or opportunities. In other words, whether they are not all the same.\n\n**Guiding question:** To what extent is diversity in this feature/environmental characteristic considered?\n\nExample: For 5 swings: Are they all different types (e.g. large swing, baby swing, basket swing, rope swing), or are they all identical?\n\n**It is your judgment to indicate if there is No diversity, Some diversity or A lot of diversity considered. You can only choose one!**",
        "### 3. Challenge opportunities\nChallenge opportunities assess whether the feature provides opportunities with different levels of difficulty.\n\n**Guiding question:** To what extent does this feature/environmental characteristic offer different levels of challenge?\n\nExample: The swings provided should be examined and judged if they provide increasing challenging opportunities.\n\n**It is your judgment to indicate if the provided swings offer different levels of difficulty. You can only choose one!**",
        "### 4. Sociability support\nSociability support assesses whether more than one child/person can use this feature/environmental characteristic together. It considers whether the feature can be used by more than one person at once, individually, in small groups, or in larger groups.\n\n**Guiding question:** Can more than one child (or person) use this feature together?\n\nExample: Can some of the swings be used alone? Can some be used in pairs? Can some be used in groups of children?\n\n**It is your judgment to indicate if they can be used alone, in pairs or in groups.**",
        "## Open reflection\nThe open question gives you the possibility to write down some reflections. A guiding question will ask you to describe one or two aspects you recommend changing in the playspace to increase its play value and usability.",
        "## Two parts of the audit\nThe Comprehensive Outdoor Playspace Audit (COPA) Tool uses two methods for assessing a playspace:\n\n- **(A) Onsite Audit of the Physical Environment**\nThis part of the audit assesses aspects of the playspace that can only be examined onsite in the physical environment.\nIt requires being physically present at the playspace.\n\n- **(B) Survey of Ecological Aspects of the Playspace**\nThis part of the audit assesses information related to the history, management practices, and how weather and seasons influence playspace use.\nIt does not require being onsite.\nIt must be answered by someone familiar with the playspace's background and context.",
        "## Before you continue\nBefore moving to the next section, you must decide which part(s) of the audit you will complete: A, B, or A & B.\n\nYour choice depends on how familiar you are with the playspace and what role you have.",
    ],
    sections: {
        section_4_playspace_information_wayfinding: {
            description:
                "Playspace Information & Wayfinding considers how people orient themselves within the playspace, how easy the site is to navigate, and whether guidance about use is clearly available.",
        },
        section_6_climate_protection_adaptability: {
            description:
                "Climate Protection & Adaptability considers how well the playspace supports comfortable use across sun, wind, rain, seasonal change, and different daylight conditions.",
            notesPrompt:
                "Any comments? Describe one or more recommendations to improve climate protection and adaptability in this playspace:",
        },
        section_7_boundaries_entrances: {
            notesPrompt:
                "Any comments? Describe one or more recommendations to improve the boundaries and entrances of this playspace:",
        },
        section_8_pathways: {
            description:
                "Pathways consider how people move through the playspace, including accessibility, surfacing, route clarity, width, and the play value of movement paths.",
            notesPrompt:
                "Any comments? Describe one or more recommendations to improve the pathways of this playspace:",
        },
        section_13_natural_play_features: {
            instruction:
                "Important: This audit focuses on natural play features that are provided and intended for play, not features that only make the space look natural (for example, trees used only for shade but not for climbing). Read each statement and answer the questions. This playspace...",
        },
        section_19_novelty: {
            description:
                "Novelty considers whether the playspace offers surprising, changing, exploratory, or uncommon experiences that keep play interesting over time.",
        },
        section_21_accommodating_diverse_abilities: {
            description:
                "Accommodating Diverse Abilities examines how effectively a playspace supports children with diverse physical, sensory, and communication needs. It considers accessibility, usability, communication supports, transitions, and inclusive participation across a wide range of abilities.",
        },
    },
};
