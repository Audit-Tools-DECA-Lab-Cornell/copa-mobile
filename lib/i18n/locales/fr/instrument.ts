import type { InstrumentTranslations } from "../../instrument-translations";

/**
 * Auto-generated translation overrides for the fr instrument locale.
 *
 * Regenerate with `python3 scripts/translate_i18n.py --format instrument`.
 */
export const frInstrumentTranslations = {
    metadata: {
        instrumentName: "Outil d’audit de la valeur ludique et de l’utilisabilité des aires de jeux Playspace",
        currentSheet: "PVUA v5.2",
    },
    preamble: [
        "## Comment l’outil est structuré\nL’outil d’audit de la valeur ludique et de l’utilisabilité de Playspace est structuré en 22 domaines. Chaque domaine comporte entre 2 et 12 items. Tous les items représentent des caractéristiques ou des attributs spécifiques de l’environnement.",
        "Chaque item est évalué au moyen de jusqu’à quatre échelles : Mise à disposition, Diversité, Possibilités de défi et Soutien à la sociabilité. Tous les items n’incluent pas chaque échelle.",
        "### 1. Mise à disposition\nLa mise à disposition est toujours évaluée en premier. Lorsque la réponse concernant la mise à disposition est une réponse de type zéro, telle que Non ou Sans objet, les autres échelles restent masquées, car elles ne s’appliquent pas.",
        "### 2. Diversité\nLa diversité évalue si les éléments fournis offrent une variété de types, de formes ou de possibilités. Autrement dit, s’ils ne sont pas tous identiques.\n\n**Question directrice :** Dans quelle mesure la diversité de cette caractéristique de l’élément/de l’environnement est-elle prise en compte ?\n\nExemple : Pour 5 balançoires : sont-elles toutes de types différents (p. ex. grande balançoire, balançoire pour bébé, balançoire panier, balançoire à corde), ou sont-elles toutes identiques ?\n\n**C’est à vous de juger s’il n’y a pas de diversité, s’il y a un peu de diversité ou s’il y a beaucoup de diversité prise en compte. Vous ne pouvez choisir qu’une seule réponse !**",
        "### 3. Possibilités de défi\nLes possibilités de défi évaluent si l’élément offre des possibilités avec différents niveaux de difficulté.\n\n**Question directrice :** Dans quelle mesure cette caractéristique de l’élément/de l’environnement offre-t-elle différents niveaux de défi ?\n\nExemple : Les balançoires fournies doivent être examinées et jugées pour déterminer si elles offrent des possibilités de défi croissantes.\n\n**C’est à vous de juger si les balançoires fournies offrent différents niveaux de difficulté. Vous ne pouvez choisir qu’une seule réponse !**",
        "### 4. Soutien à la sociabilité\nLe soutien à la sociabilité évalue si plus d’un enfant ou d’une personne peut utiliser cette caractéristique de l’élément/de l’environnement ensemble. Il prend en compte la possibilité d’utiliser l’élément à plusieurs en même temps, individuellement, en petits groupes ou en groupes plus importants.\n\n**Question directrice :** Plus d’un enfant (ou d’une personne) peut-il utiliser cette caractéristique ensemble ?\n\nExemple : Certaines balançoires peuvent-elles être utilisées seul(e) ? Certaines peuvent-elles être utilisées à deux ? Certaines peuvent-elles être utilisées par des groupes d’enfants ?\n\n**C’est à vous de juger si elles peuvent être utilisées seul(e), à deux ou en groupe.**",
        "## Réflexion ouverte\nLa question ouverte vous donne la possibilité de consigner કેટલીક réflexions. Une question directrice vous demandera de décrire un ou deux aspects que vous recommandez de modifier dans l’aire de jeu afin d’augmenter sa valeur ludique et son utilisabilité.",
        "## Deux parties de l’audit\nL’outil d’audit de la valeur ludique et de l’utilisabilité de Playspace utilise deux méthodes pour évaluer une aire de jeu :\n\n- **(A) Audit sur site de l’environnement physique**\nCette partie de l’audit évalue les aspects de l’aire de jeu qui ne peuvent être examinés que sur place, dans l’environnement physique.\nElle nécessite d’être physiquement présent sur l’aire de jeu.\n\n- **(B) Enquête sur les aspects écologiques de l’aire de jeu**\nCette partie de l’audit évalue les informations relatives à l’historique, aux pratiques de gestion et à la manière dont la météo et les saisons influencent l’utilisation de l’aire de jeu.\nElle ne nécessite pas d’être sur place.\nElle doit être renseignée par une personne familière du contexte et de l’historique de l’aire de jeu.",
        "## Avant de continuer\nAvant de passer à la section suivante, vous devez décider quelle(s) partie(s) de l’audit vous allez compléter : A, B, ou A et B.\n\nVotre choix dépend de votre degré de familiarité avec l’aire de jeu et du rôle que vous occupez.",
    ],
    executionModes: {
        both: {
            label: "Je connais très bien l’aire de jeux et je suis sur place.",
            description: "Répondez à la fois au questionnaire et aux éléments de l’audit sur site.",
        },
        survey: {
            label: "Je connais très bien l’aire de jeux, mais je ne suis pas sur place.",
            description: "Répondez uniquement aux éléments du questionnaire.",
        },
        audit: {
            label: "Je ne connais pas bien l’aire de jeux, mais je suis sur place.",
            description: "Répondez uniquement aux éléments de l’audit sur site.",
        },
    },
    preAuditQuestions: {
        auditor_code: {
            label: "ID de l’auditeur",
        },
        audit_date: {
            label: "Date de l’audit",
            description: "Générée automatiquement lors de la création de la session d’audit.",
        },
        started_at: {
            label: "Heure de début de l’audit",
            description: "Générée automatiquement lors de la création de la session d’audit.",
        },
        submitted_at: {
            label: "Heure de fin de l’audit",
            description: "Générée automatiquement lors de la soumission de l’audit.",
        },
        total_minutes: {
            label: "Durée totale en minutes",
            description: "Calculée automatiquement à partir des horodatages de début et de fin.",
        },
        place_size: {
            label: "Taille de l’aire de jeux selon votre estimation",
            options: {
                small: {
                    label: "Petite",
                    description:
                        "1 à 2 zones d’activité seulement ; p. ex. dans un petit parc de quartier ou un ensemble résidentiel",
                },
                medium: {
                    label: "Moyenne",
                    description:
                        "2 à 5 zones d’activité ; p. ex. dans un parc de taille moyenne ou une petite cour d’école",
                },
                large: {
                    label: "Grande",
                    description:
                        "6 à 10 zones d’activité ; p. ex. dans un grand parc urbain ou une grande cour d’école",
                },
                very_large: {
                    label: "Très grande",
                    description: "Plus de 10 zones d’activité ; p. ex. une grande aire de jeu de destination",
                },
            },
        },
        current_users_0_5: {
            label: "0-5 ans",
            options: {
                none: {
                    label: "Aucun",
                },
                a_few: {
                    label: "Quelques-uns",
                },
                a_lot: {
                    label: "Beaucoup",
                },
            },
        },
        current_users_6_12: {
            label: "6-12 ans",
            options: {
                none: {
                    label: "Aucun",
                },
                a_few: {
                    label: "Quelques-uns",
                },
                a_lot: {
                    label: "Beaucoup",
                },
            },
        },
        current_users_13_17: {
            label: "13-17 ans",
            options: {
                none: {
                    label: "Aucun",
                },
                a_few: {
                    label: "Quelques-uns",
                },
                a_lot: {
                    label: "Beaucoup",
                },
            },
        },
        current_users_18_plus: {
            label: "Adultes (18 ans et plus)",
            options: {
                none: {
                    label: "Aucun",
                },
                a_few: {
                    label: "Quelques-uns",
                },
                a_lot: {
                    label: "Beaucoup",
                },
            },
        },
        playspace_busyness: {
            label: "À quel point l’aire de jeu est-elle fréquentée actuellement ?",
            options: {
                not_at_all_busy: {
                    label: "Pas du tout fréquentée",
                },
                somewhat_busy: {
                    label: "Assez fréquentée",
                },
                very_busy: {
                    label: "Très fréquentée",
                },
            },
        },
        season: {
            label: "Saison actuelle",
            options: {
                spring: {
                    label: "Printemps",
                },
                summer: {
                    label: "Été",
                },
                autumn: {
                    label: "Automne",
                },
                winter: {
                    label: "Hiver",
                },
            },
        },
        weather_conditions: {
            label: "Conditions météorologiques au moment de l’audit",
            options: {
                full_sun: {
                    label: "Plein soleil",
                },
                partial_sun_cloud: {
                    label: "Partiellement ensoleillé / nuageux",
                },
                cloudy_overcast: {
                    label: "Nuageux / couvert",
                },
                foggy_misty: {
                    label: "Brumeux / embrumé",
                },
                light_rain: {
                    label: "Petite pluie",
                },
                moderate_rain: {
                    label: "Pluie modérée",
                },
                light_snow: {
                    label: "Faible chute de neige",
                },
                moderate_snow: {
                    label: "Chute de neige modérée",
                },
                sunshine: {
                    label: "Ensoleillé",
                },
                cloudy: {
                    label: "Nuageux",
                },
                windy: {
                    label: "Venteux",
                },
                inclement_weather: {
                    label: "Mauvais temps",
                },
            },
        },
        wind_conditions: {
            label: "Conditions de vent actuelles",
            options: {
                no_wind: {
                    label: "Pas de vent",
                },
                light_wind: {
                    label: "Vent léger",
                },
                occasional_gusts: {
                    label: "Rafales occasionnelles",
                },
                heavy_wind: {
                    label: "Vent fort",
                },
            },
        },
        users_present: {
            label: "Utilisateurs présents sur l’aire de jeux au moment de l’audit",
            options: {
                none: {
                    label: "Aucun",
                },
                children: {
                    label: "Enfants",
                },
                adults: {
                    label: "Adultes",
                },
            },
        },
        user_count: {
            label: "Nombre d’utilisateurs",
            options: {
                none: {
                    label: "Aucun",
                },
                some: {
                    label: "Quelques-uns",
                },
                a_lot: {
                    label: "Beaucoup",
                },
            },
        },
        age_groups: {
            label: "Tranches d’âge estimées des enfants utilisant l’aire de jeux",
            options: {
                under_5: {
                    label: "Moins de 5 ans",
                },
                age_6_10: {
                    label: "Enfants de 6 à 10 ans",
                },
                age_11_plus: {
                    label: "Enfants de 10 ans et plus",
                },
            },
        },
    },
    scales: {
        provision: {
            title: "Quantité",
            prompt: "Dans quelle quantité cette caractéristique ou cet élément de l’environnement est-il pris en compte ?",
            description:
                "La quantité fait référence au nombre d’équipements ou de caractéristiques environnementales spécifiques disponibles.",
            options: {
                no: {
                    label: "Non",
                },
                some: {
                    label: "Quelques-uns",
                },
                a_lot: {
                    label: "Beaucoup",
                },
                not_applicable: {
                    label: "Non applicable",
                },
            },
        },
        diversity: {
            title: "Diversité",
            prompt: "Dans quelle mesure la diversité de cette caractéristique ou de cet élément de l’environnement est-elle prise en compte ?",
            description:
                "La diversité évalue si les éléments proposés offrent de la variété plutôt que d’être tous identiques.",
            options: {
                not_applicable: {
                    label: "Non applicable",
                },
                no_diversity: {
                    label: "Aucune diversité",
                },
                some_diversity: {
                    label: "Une certaine diversité",
                },
                a_lot_of_diversity: {
                    label: "Beaucoup de diversité",
                },
            },
        },
        challenge: {
            title: "Défi",
            prompt: "Dans quelle mesure cette caractéristique ou cet élément de l’environnement offre-t-il différents niveaux de défi ?",
            description: "Le défi évalue si l’équipement offre des possibilités avec différents niveaux de difficulté.",
            options: {
                not_applicable: {
                    label: "Non applicable",
                },
                no_challenge: {
                    label: "Aucun défi",
                },
                some_challenge: {
                    label: "Un certain défi",
                },
                a_lot_of_challenge: {
                    label: "Beaucoup de défi",
                },
            },
        },
        sociability: {
            title: "Sociabilité",
            prompt: "Plus d’un enfant ou d’une personne peut-il/elle utiliser cet équipement ensemble ?",
            description:
                "La sociabilité tient compte du fait que l’équipement peut être utilisé seul, à deux ou en groupe plus large.",
            options: {
                not_applicable: {
                    label: "Non applicable",
                },
                no: {
                    label: "Non",
                },
                yes_a_pair: {
                    label: "Oui - à deux",
                },
                yes_more_than_two_children: {
                    label: "Oui - plus de deux enfants",
                },
            },
        },
    },
    sections: {
        section_1_playspace_character_community: {
            title: "Caractère et communauté de l’aire de jeux",
            description:
                "Caractère et communauté de l’aire de jeux décrit les aspects d’une aire de jeux qui offrent aux usagers des possibilités de se connecter au terrain de jeu. Ces aspects concernent l’histoire/le patrimoine/l’art/les récits locaux, les événements communautaires organisés dans l’aire de jeux, ainsi que la manière dont l’aire de jeux a été conçue et pour qui elle l’a été.",
            instruction: "Lisez chaque affirmation et répondez aux questions. Cette aire de jeux...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer le caractère et l’implication communautaire de cette aire de jeux :",
            questions: {
                q_1_1: {
                    prompt: "a été **développée ou conçue avec la participation des usagers** de l’aire de jeux (p. ex. enfants ; parents ; organisations communautaires)",
                },
                q_1_2: {
                    prompt: "a été **développé ou conçu spécifiquement** pour offrir des possibilités de jeu** à une ou plusieurs populations mal desservies identifiées**, comme les filles, les minorités ou les enfants ayant des besoins divers",
                },
                q_1_3: {
                    prompt: "** reflète les aspects culturels et historiques de la communauté** (p. ex., l’art/les histoires/le patrimoine locaux sont représentés ; des matériaux d’origine locale sont utilisés)",
                },
                q_1_4: {
                    prompt: "**présente** des **aspects/possibilités uniques ou novateurs** qui le distinguent des autres aires de jeux (p. ex., aire de jeux très naturalisée ; espaces ou éléments que les enfants peuvent façonner et manipuler ; structures de jeu sculpturales)",
                },
                q_1_5: {
                    prompt: "**est** **encadré par des adultes** **qui facilitent activement le jeu des enfants** (p. ex. en proposant de nouvelles possibilités dans l’environnement pour de nouvelles formes de jeu / des formes de jeu changeantes)",
                },
                q_1_6: {
                    prompt: "**implique les utilisateurs** de l’aire de jeux (enfants et/ou adultes) **dans les activités d’entretien** (p. ex., aménagement paysager, peinture ; désigne des adultes vivant à proximité pour garder un œil sur l’aire de jeux)",
                },
                q_1_7: {
                    prompt: "**accueille des événements communautaires**",
                },
            },
        },
        section_2_playspace_location_connectivity: {
            title: "Emplacement et connectivité de l’aire de jeux",
            description:
                "Emplacement et connectivité de l’aire de jeux : comment l’aire de jeux est intégrée dans le secteur, si d’autres possibilités de jeu et de loisirs sont disponibles, ainsi que la manière dont les utilisateurs accèdent à l’aire de jeux.",
            instruction: "Lisez chaque énoncé et répondez aux questions. Cette aire de jeux...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer l’emplacement et la connectivité de cette aire de jeux :",
            questions: {
                q_2_1: {
                    prompt: "est **accessible par des chemins piétons ou cyclables **",
                },
                q_2_2: {
                    prompt: "est **accessible par les transports en commun **(p. ex., il y a un arrêt de transport en commun à ou près d’au moins une entrée)",
                },
                q_2_3: {
                    prompt: "est **située près d’une zone résidentielle** (à moins de 10 min à pied)",
                },
                q_2_4: {
                    prompt: "est** située près d’écoles et/ou de services de garde **(à moins de 10 min à pied)",
                },
                q_2_5: {
                    prompt: "est **située près d’autres lieux publics intéressants/importants pour les enfants et les familles, ou intégrée à ceux-ci** (p. ex., parc ; centre communautaire ; bibliothèque ; commodités ; lieux de rassemblement communautaire ; musées ; jardin communautaire ; espaces naturels ; café)",
                },
                q_2_6: {
                    prompt: "est **intégrée à un espace naturalisé plus vaste ou reliée à celui-ci** (p. ex. forêt ; boisé ; grand jardin ; zone de conservation)",
                },
                q_2_7: {
                    prompt: "est **située directement à côté de routes à circulation dense ou rapide** sans options de traversée claires/sécuritaires [Note : cet élément doit être coté en sens inverse]",
                },
                q_2_8: {
                    prompt: "se trouve directement à proximité de routes à circulation dense ou rapide, sans clôture ni options de traversée claires et sûres",
                },
            },
        },
        section_3_playspace_rules_restrictions: {
            title: "Règles et restrictions de l’aire de jeux",
            description:
                "Les règles et restrictions de l’aire de jeux évaluent si certaines règles et restrictions entravent le jeu en plein air.",
            instruction: "Lisez chaque énoncé et répondez aux questions. Cette aire de jeux...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer les règles et restrictions de cette aire de jeux :",
            questions: {
                q_3_1: {
                    prompt: "**restreint certains groupes d’âge** dans l’aire de jeux (p. ex., enfants plus âgés, adolescents)  [Cet élément doit être coté en sens inverse]",
                },
                q_3_2: {
                    prompt: "**restreint certains types de jeu ou de comportement** (p. ex., faire du bruit, jeux de balle ; utiliser des équipements de jeu à roues ou des luges)  [Cet élément doit être coté en sens inverse]",
                },
                q_3_3: {
                    prompt: "**restreint l’accès des enfants en exigeant la supervision d’un adulte** (c.-à-d. que la supervision d’un proche aidant n’est pas obligatoire, sauf peut-être pour les très jeunes enfants ; les enfants peuvent utiliser l’aire de jeux de façon autonome)  [Cet élément doit être coté en sens inverse]",
                },
            },
        },
        section_4_playspace_information_wayfinding: {
            title: "Information et orientation de l’aire de jeux",
            description:
                "L’information et l’orientation de l’aire de jeux tiennent compte de la façon dont les personnes s’orientent dans l’aire de jeux, de la facilité à s’y déplacer et de la clarté des indications sur son utilisation.",
            instruction: "Lisez chaque énoncé et répondez aux questions. Cette aire de jeux...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer l’information et l’orientation de cette aire de jeux :",
            questions: {
                q_4_1: {
                    prompt: "dispose d’**informations en ligne** relatives à l’utilisation et aux caractéristiques de l’aire de jeux (p. ex., heures d’ouverture, accessibilité, options de transport en commun, stationnement)",
                },
                q_4_2: {
                    prompt: "a un **aménagement facile à parcourir** (p. ex. trajet principal clair et logique de l’entrée à la sortie ; zones de jeu clairement définies)",
                },
                q_4_3: {
                    prompt: "dispose de **plans et/ou d’une signalisation accessibles ****aux entrées** de l’aire de jeux fournissant des indications d’orientation et d’utilisation  (p. ex. positionnés à une hauteur accessible pour les utilisateurs de fauteuil roulant ; utilisent le braille, des pictogrammes et/ou un fort contraste de couleurs ; informations disponibles par code QR ) a",
                },
                q_4_4: {
                    prompt: "dispose de **plans et/ou d’une signalisation adaptés aux enfants, faciles à lire/comprendre ****aux entrées** (p. ex. positionnés à une  hauteur adaptée aux jeunes enfants ; utilisent un langage simple, des symboles et/ou des images)",
                },
                q_4_5: {
                    prompt: "dispose de **plans et/ou d’une signalisation accessibles ****répartis dans l’aire de jeux** fournissant des indications d’orientation  et d’utilisation  (p. ex. positionnés à une hauteur accessible pour les utilisateurs de fauteuil roulant ; utilisent le braille, des pictogrammes et/ou un fort contraste de couleurs ; informations disponibles par code QR ) a",
                },
                q_4_6: {
                    prompt: "dispose de **plans et/ou d’une signalisation adaptés aux enfants, faciles à lire/comprendre ****répartis dans l’aire de jeux** (p. ex. positionnés à une  hauteur adaptée aux jeunes enfants ; utilisent un langage simple, des symboles et/ou des images)a",
                },
            },
        },
        section_5_management_maintenance: {
            title: "Gestion et entretien",
            description:
                "La gestion et l’entretien décrivent les considérations permettant d’offrir un environnement sûr et propice au jeu.",
            instruction: "Lisez chaque énoncé et répondez aux questions. Cette aire de jeux...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer la gestion et l’entretien de cette aire de jeux :",
            questions: {
                q_5_1: {
                    prompt: "dispose d’un **certificat de sécurité à jour **pour les équipements de jeu et/ou les surfaces",
                },
                q_5_2: {
                    prompt: "est **généralement en bon état**, avec peu ou pas de dangers visibles tels que des équipements/revêtements cassés ou endommagés, des restes d’équipements retirés, du bois pourri ou rugueux, de la peinture écaillée",
                },
                q_5_3: {
                    prompt: "est **globalement propre** et bien entretenu (p. ex. peu/pas de graffitis, de mégots, de déchets ou d’autres débris dangereux tels que du verre brisé, des seringues, des excréments d’animaux, des plantes envahissantes)",
                },
                q_5_4: {
                    prompt: "a** suffisamment de poubelles** par rapport à la taille de l’aire de jeux et dans les zones appropriées (p. ex. à/près des points d’entrée ; près des tables/zones assises)",
                },
                q_5_5: {
                    prompt: "présente **des odeurs désagréables persistantes**, y compris dans les espaces clos (p. ex. provenant d’excréments d’animaux, de fumée et/ou de déchets)  [Cet élément doit être noté en sens inverse]",
                },
                q_5_6: {
                    prompt: "dispose **d’un espace de rangement** pour les pièces détachées et/ou les équipements à enfourcher",
                },
                q_5_7: {
                    prompt: "est **aménagé et entretenu de manière à offrir de nouvelles possibilités de jeu **(p. ex. des tunnels sont taillés dans la végétation ; des branches basses et des rochers sont laissés pour grimper ; comprend des zones non tondues ; des feuilles/fleurs/petites branches tombées sont volontairement laissées pour jouer ; la végétation n’est pas taillée de façon excessive)",
                },
            },
        },
        section_6_climate_protection_adaptability: {
            title: "Protection climatique et adaptabilité",
            description:
                "La protection climatique et l’adaptabilité évaluent dans quelle mesure l’aire de jeux permet une utilisation confortable selon le soleil, le vent, la pluie, les changements saisonniers et les différentes conditions de luminosité.",
            instruction: "Lisez chaque énoncé et répondez aux questions. Cette aire de jeux...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer la protection climatique et l’adaptabilité de cette aire de jeux :",
            questions: {
                q_6_1: {
                    prompt: "offre **de l’ombre ou un abri** **à la plupart des zones assises** à un moment de la journée",
                },
                q_6_2: {
                    prompt: "offre **de l’ombre ou un abri contre le soleil/les intempéries dans la plupart des principales zones de jeu **à un moment de la journée (p. ex. grâce aux arbres/à la végétation ; aux bâtiments ; aux structures d’ombrage ou aux auvents ; au positionnement des équipements).",
                },
                q_6_3: {
                    prompt: "est conçu et/ou entretenu pour offrir une protection contre les intempéries/le soleil/le vent grâce au **placement des éléments et/ou à l’aménagement paysager** (p. ex. brise-vent fourni par des plantations persistantes)",
                },
                q_6_4: {
                    prompt: "dispose d’un **éclairage adapté à la situation géographique et aux conditions locales** pour garantir un sentiment de sécurité et prolonger les temps de jeu (p. ex. éclairage adapté aux mois d’hiver, aux soirées ou aux conditions météorologiques changeantes, et/ou chemins éclairés vers l’aire de jeux)",
                },
                q_6_5: {
                    prompt: "dispose d’un **drainage approprié** qui empêche les inondations ou la présence de grandes quantités d’eau stagnante",
                },
            },
        },
        section_7_boundaries_entrances: {
            title: "Limites et entrées",
            description:
                "Les limites et les entrées concernent l’accès aux aires de jeux et leur séparation. Les limites sont définies comme des bordures claires qui indiquent les contours d’une zone ou délimitent des zones d’activité distinctes ; elles peuvent inclure des clôtures, des murs ou des haies. Les entrées sont définies comme les endroits où les personnes entrent/sortent des aires de jeux ou des zones d’activité ; elles peuvent être formelles (p. ex. portails) ou informelles (p. ex. ouvertures dans les limites ou changements de revêtement de sol).",
            instruction: "Lisez chaque énoncé et répondez aux questions. Cette aire de jeux...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer les limites et les entrées de cette aire de jeux :",
            questions: {
                q_7_1: {
                    prompt: "dispose de clôtures/limites **pour séparer les zones de jeu des dangers importants** tels que la circulation routière ou les eaux profondes",
                },
                q_7_2: {
                    prompt: "dispose de clôtures/limites **qui sont** **visuellement perméables**, permettant une observation/surveillance facile des espaces adjacents",
                },
                q_7_3: {
                    prompt: "tous les **portails peuvent être facilement ouverts par des adultes** (y compris ceux ayant une force de préhension limitée ou utilisant un fauteuil roulant/un appareil de mobilité)",
                },
                q_7_4: {
                    prompt: "toute **zone entourée de limites/clôtures de pleine hauteu**r dispose de plus d’une entrée/sortie",
                },
            },
        },
        section_8_pathways: {
            title: "Chemins",
            description:
                "Les chemins concernent la manière dont les personnes se déplacent dans l’aire de jeux, notamment l’accessibilité, le revêtement, la clarté des parcours, la largeur et la valeur ludique des trajets.",
            instruction: "Lisez chaque énoncé et répondez aux questions. Cette aire de jeux...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer les chemins de cette aire de jeux :",
            questions: {
                q_8_1: {
                    prompt: "dispose de chemins principaux qui **offrent des expériences variées pour rouler/courir/marcher** (p. ex. chemins droits et sinueux ou en boucle ; chemins avec ondulations ou bosses ; chemins passant par des tunnels ou des jardins/zones boisées)",
                },
                q_8_2: {
                    prompt: "dispose de chemins principaux menant à chaque zone/élément de jeu qui ont un **revêtement stable et plat**, permettant à tous les utilisateurs d’y marcher/courir/rouler (y compris avec des appareils de mobilité)",
                },
                q_8_3: {
                    prompt: "dispose de chemins **assez larges pour au moins 2 personnes** afin de rouler/courir/marcher côte à côte",
                },
                q_8_4: {
                    prompt: "dispose de chemins secondaires offrant **de nouveaux parcours ludiques **(p. ex. souches alignées ; pas japonais à travers un jardin ou un ruisseau ; parcours de jeu à travers un tunnel en saule ou une structure de jeu ; chemin tondu dans de hautes herbes ; tunnel sous une colline ou une butte ; chemin à surface sensorielle)",
                },
            },
        },
        section_9_open_space: {
            title: "Espace ouvert",
            description:
                "Un espace ouvert est défini comme une zone intégrée dans ou autour de l’aire de jeux, sans éléments de jeu, autres structures construites ni plantations. Les espaces ouverts sont des zones polyvalentes utilisées de manière flexible, offrant une diversité de possibilités comme courir, marcher, jouer avec des éléments libres (ballons, cerceaux ou éléments naturels, entre autres), s’asseoir ou se détendre, pique-niquer, jouer en groupe, …",
            instruction: "Lisez chaque énoncé et répondez aux questions. Cette aire de jeux...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer les espaces ouverts de cette aire de jeux :",
            questions: {
                q_9_1: {
                    prompt: "comprend **des espaces ouverts et majoritairement plats** (avec peu ou pas de pente) permettant des jeux variés comme les jeux de balle ou sportifs, les jeux de groupe ou les rassemblements",
                },
                q_9_2: {
                    prompt: "une partie des espaces plats et ouverts dispose de **surfaces accessibles**, permettant l’utilisation d’appareils à roulettes comme des fauteuils roulants ou des trottinettes",
                },
            },
        },
        section_10_enclosed_bounded_spaces: {
            title: "Espaces clos et délimités",
            description:
                "Les espaces clos et délimités sont définis par une limite claire et sont entièrement ou partiellement fermés. On les trouve dans l’environnement naturel et bâti. Exemples : recoins, petites cavités, bordures basses surélevées délimitant un espace plus petit, cabanes de jeu, tanières, petits espaces surélevés au-dessus du sol, ...). Les espaces clos et délimités permettent aux enfants d’être seuls, d’être avec un petit groupe d’enfants pour socialiser, de se cacher et d’être à l’écart des adultes ou de se sentir hors du regard des adultes. Les espaces clos et délimités peuvent favoriser le jeu créatif et imaginatif.",
            instruction: "Lisez chaque énoncé et répondez aux questions. Cet espace de jeu...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer les espaces clos et délimités de cet espace de jeu :",
            questions: {
                q_10_1: {
                    prompt: "comprend des espaces clos ou délimités qui offrent **un sentiment d’enfermement** (p. ex., de type maison, de type pièce) ou **qui sont entièrement fermés** (p. ex., maisonnette de jeu ; cabanes ou tanières ; cabanes dans les arbres ; petits espaces clos formés par ou sous des arbres/arbustes, espaces clos et délimités surélevés ou au niveau du sol)",
                },
                q_10_2: {
                    prompt: "comprend  des espaces clos ou délimités qui **offrent aussi la possibilité de regarder dehors et d’observer** sans être trop visibles depuis l’extérieur (p. ex. maisonnette de jeu avec petites fenêtres ; structure de bateau avec hublots ; cabane en herbe avec petite ouverture de porte)",
                },
                q_10_3: {
                    prompt: "comprend **des bordures / rebords bas et surélevés qui définissent des espaces plus petits** (p. ex., petites niches ; recoins ; coins ; bacs à sable subdivisés)",
                },
            },
        },
        section_11_sport_game_spaces: {
            title: "Espaces de sport et de jeu",
            description:
                "Les espaces de sport et de jeu sont des zones définies qui permettent aux enfants de pratiquer certains types de jeux, comme le soccer, le basketball et le tennis de table. Ces zones de sport et de jeu sont parfois séparées de l’aire de jeux. Si les zones sportives sont proches ou intégrées à l’espace de jeu, incluez-les dans l’évaluation.",
            instruction: "Lisez chaque énoncé et répondez aux questions. Cet espace de jeu...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer les espaces de sport et de jeu de cet espace de jeu :",
            questions: {
                q_11_1: {
                    prompt: "comprend **des espaces pouvant accueillir des sports ou des jeux** (p. ex. terrains de soccer, de basketball ou de tennis ; tennis de table ; jeux sur revêtement)",
                },
                q_11_2: {
                    prompt: "comprend des espaces de sport/de jeu avec des **surfaces**** ****adaptées aux activités prévues** (p. ex. surfaces en herbe ou revêtues, plates et ouvertes, pour le soccer ou le basketball)",
                },
                q_11_3: {
                    prompt: "comprend des espaces de sport/de jeu disposant d’un **équipement ou de marquages adaptés** à l’activité (p. ex. poteaux de but ; paniers et filets de basketball ; marquages au sol pour le jeu du carré ou la marelle)",
                },
            },
        },
        section_12_manufactured_play_features: {
            title: "Éléments de jeu fabriqués",
            description:
                "Les éléments de jeu fabriqués sont des éléments conçus pour le jeu, parfois appelés équipements ou composants de jeu. Ils peuvent être fabriqués à partir de divers matériaux, notamment le plastique, le métal ou le bois.",
            instruction: "Lisez chaque énoncé et répondez aux questions. Cet espace de jeu...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer les éléments de jeu fabriqués de cet espace de jeu :",
            questions: {
                q_12_1: {
                    prompt: "comprend des structures/éléments de jeu **non prescrits ou de forme libre, qui permettent aux enfants de développer leurs propres idées de jeu** (p. ex., simplement une structure ; structures ambiguës ; éléments sculpturaux ; structures ou éléments de jeu thématiques)",
                },
                q_12_2: {
                    prompt: "comprend des éléments de jeu fabriqués qui offrent des possibilités de **glisser** (p. ex. toboggan ouvert, toboggan fermé,  toboggan tubulaire, barre de pompier, tyrolienne, toboggan à rouleaux,...)",
                },
                q_12_3: {
                    prompt: "comprend des éléments de jeu fabriqués qui permettent de **grimper, se suspendre et/ou se hisser**  (p. ex. anneaux de gymnastique ; barre de traction ; mur d’escalade ; structure à grimper ; échelle)",
                },
                q_12_4: {
                    prompt: "comprend des éléments de jeu fabriqués qui permettent de **tourner/pivoter** (p. ex.tourniquets ; manège ; toboggan en spirale ; balançoires qui peuvent tourner)",
                },
                q_12_5: {
                    prompt: "comprend des éléments de jeu fabriqués qui permettent de **garder l’équilibre  **sur ou à travers (p. ex. poutre d’équilibre ou troncs ; planche instable ; ponts branlants ; cordes d’équilibre ; plateformes étroites)",
                },
                q_12_6: {
                    prompt: "comprend des éléments de jeu fabriqués qui permettent de **se balancer** (p. ex. un tape-cul/balançoire à bascule ; jeu sur ressort)",
                },
                q_12_7: {
                    prompt: "comprend des éléments de jeu fabriqués qui permettent de **ramper **à l’intérieur, dessus ou à travers  (p. ex. filet à ramper ; tunnel)",
                },
                q_12_8: {
                    prompt: "comprend des éléments de jeu fabriqués qui permettent de **rebondir ou sauter de/sur**f (p. ex. trampoline ; podium ; éléments de parkour)",
                },
                q_12_9: {
                    prompt: "comprend des éléments de jeu fabriqués qui permettent ** la manipulation en poussant, faisant glisser, tournant, ouvrant et/ou fermant des objets** (p. ex volant ; fenêtres ou portes fonctionnelles ; panneau de jeu ; pompe ; poulie ; équipement musical/sonore)",
                },
                q_12_11: {
                    prompt: "comprend des éléments de jeu fabriqués **orientés et/ou reliés de manière à permettre des parcours de jeu** à travers un ou plusieurs éléments (p. ex. un parcours d’obstacles intégré ; des éléments placés suffisamment proches les uns des autres pour faciliter le jeu entre plusieurs éléments)",
                },
                q_12_12: {
                    prompt: "comprend **plusieurs façons de monter/descendre de toute grande structure de jeu** (p. ex., rampes ; marches ; filet/mur d’escalade ; accès par talus)",
                },
            },
        },
        section_13_natural_play_features: {
            title: "Éléments de jeu naturels",
            description:
                "Les éléments de jeu naturels peuvent être situés dans l’aire de jeux ou autour de celle-ci. Les environnements naturels comprennent la végétation, les arbustes, les herbes hautes, les zones arborées, les buissons, les rochers et les pierres. Les éléments naturels offrent une variété de possibilités de jeu, notamment le jeu physique actif (p. ex., grimper), l’exploration, le jeu sensoriel, la manipulation, la création de leur propre jeu (p. ex., jeu socio-dramatique ou d’imagination), le repos, le fait d’être seul ou de se rassembler avec d’autres enfants.",
            instruction:
                "Important : cet audit porte sur les éléments de jeu naturels qui sont fournis et destinés au jeu, et non sur les éléments qui donnent seulement un aspect naturel à l’espace (par exemple, des arbres utilisés uniquement pour l’ombre mais pas pour grimper). Lisez chaque affirmation et répondez aux questions. Cette aire de jeux...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer les éléments de jeu naturels de cette aire de jeux :",
            questions: {
                q_13_1: {
                    prompt: "a une **végétation de grande taille** appropriée et accessible pour le jeu (p. ex. arbres ; grands arbustes / haies, sans trop de branches coupées sur les arbres)",
                },
                q_13_2: {
                    prompt: "a **une végétation de petite taille** appropriée et accessible pour le jeu (p. ex. petits arbustes / haies ; herbes hautes ; plates-bandes avec sentiers ; zone non tondue)",
                },
                q_13_3: {
                    prompt: 'a une **végétation plus dense ou plus haute** qui permet de se cacher de manière ludique dedans/dessous, de trouver un "endroit secret" ou de ressentir le plaisir d’explorer ou de se "perdre" (p. ex. labyrinthe d’herbes hautes ; couvert végétal bas ; haies denses ; arbre feuillu à grimper)',
                },
                q_13_4: {
                    prompt: "a des **éléments naturels fixes **qui permettent de grimper, de s’asseoir dessus, d’en sauter, etc. (p. ex. rochers moyens à grands, arbres/troncs tombés)",
                },
            },
        },
        section_14_loose_manufactured_parts_equipment: {
            title: "Pièces détachées et équipements manufacturés",
            description:
                "Les pièces détachées et équipements manufacturés sont des objets de jeu fabriqués par l’humain, parfois fournis dans l’aire de jeux mais parfois apportés sur place (p. ex. pièces détachées de formes variées, karts à pédales, trottinettes, vélos, ballons/frisbees ou autres jouets, jouets pour jouer avec le sable/la boue/l’eau)",
            instruction: "Lisez chaque affirmation et répondez aux questions. Cette aire de jeux...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer les pièces détachées et équipements manufacturés de cette aire de jeux :",
            questions: {
                q_14_1: {
                    prompt: "a des **petites pièces manufacturées mobiles** disponibles, **légères et faciles à déplacer/manipuler**, y compris celles pouvant servir à manipuler des matériaux malléables et d’autres pièces mobiles (p. ex. tasses ; seaux ; pelles ; petits outils ; entonnoirs ; ballons ; cordes légères ; tissus ; ballons ; frisbees' cerceaux ; raquettes ; petites voitures/bateaux ; marionnettes)",
                },
                q_14_1_1: {
                    prompt: "Cochez toutes les petites pièces manufacturées détachées dans cet espace de jeu",
                },
                q_14_2: {
                    prompt: "a des **pièces manufacturées mobiles de taille moyenne** qui sont **un peu plus lourdes mais restent relativement faciles à déplacer/manipuler** (p. ex. boîtes ; caisses ; cônes de chantier ; casseroles et poêles ; tubes en plastique/tuyaux PVC ; blocs de construction plus grands ; outils ; pelles/râteaux plus grands ; cordes lourdes)",
                },
                q_14_2_1: {
                    prompt: "Cochez toutes les pièces manufacturées détachées de taille moyenne dans cet espace de jeu",
                },
                q_14_3: {
                    prompt: "a de **grandes pièces manufacturées mobiles** qui sont **plus lourdes et peuvent nécessiter de l’aide pour être déplacées/manipulées** (p. ex. pneus ; souches ; grands blocs ou planches ; tables ou chaises ; structures d’escalade mobiles)",
                },
                q_14_3_1: {
                    prompt: "Cochez toutes les grandes pièces manufacturées détachées dans cet espace de jeu",
                },
                q_14_4: {
                    prompt: "a des **équipements porteurs (à roues)** disponibles que les enfants peuvent utiliser pour se déplacer dans l’espace / sur les chemins (p. ex. trottinettes, bicyclettes ou tricycles, poussettes, planches à roulettes, luge/toboggan)",
                },
                q_14_4_1: {
                    prompt: "Cochez tous les équipements à chevaucher (à roues) dans cet espace de jeu",
                },
            },
        },
        section_15_loose_natural_parts_malleable_materials: {
            title: "Pièces naturelles mobiles et matériaux malléables",
            description:
                "Les pièces naturelles mobiles et les matériaux malléables comprennent des matériaux comme la terre, la boue, le sable, l’eau ou toute pièce naturelle comme les feuilles, les fleurs, les bâtons, les pierres, les pommes de pin et autres. Les pièces naturelles mobiles permettent aux enfants de collecter, arranger, créer, construire, creuser, mélanger, explorer, et de les utiliser dans le jeu socio-dramatique et créatif. Les matériaux offrent des possibilités sensorielles ainsi que de mélange, de creusage, de transport, de remplissage et de vidage, de construction, …",
            instruction: "Lisez chaque affirmation et répondez aux questions. Cette aire de jeux...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer les pièces naturelles mobiles et les matériaux malléables de cette aire de jeux :",
            questions: {
                q_15_1: {
                    prompt: "a des **matériaux naturels malléables disponibles **(p. ex. sable, gravier/galets, paillis, terre, boue, eau, neige)",
                },
                q_15_1_1: {
                    prompt: "Cochez tous les matériaux naturels malléables dans cet espace de jeu",
                },
                q_15_2: {
                    prompt: "dans les espaces où des matériaux malléables sont disponibles, il y a des **pièces mobiles naturelles ou manufacturées présentes** (p. ex. seaux/pelles ou bâtons dans les zones de sable ; casseroles, bols et cuillères dans la zone/cuisine de boue)",
                },
                q_15_3: {
                    prompt: "a des **petites pièces naturelles mobiles disponibles** (ou fournies à certaines saisons) qui sont légères et faciles à déplacer/manipuler (p. ex. feuilles ; écorce/paillis pommes de pin ; graines ; bâtons ou petites branches ; fruits ; coquillages ; fleurs, boules de neige)",
                },
                q_15_3_1: {
                    prompt: "Cochez toutes les petites pièces naturelles détachées dans cet espace de jeu",
                },
                q_15_4: {
                    prompt: "a des  **pièces naturelles mobiles de taille moyenne un peu plus lourdes** mais toujours relativement faciles à déplacer/manipuler  (p. ex. rondelles de bois ; pierres de la taille de la paume ; petites souches ; branches plus grandes ; morceaux de glace)",
                },
                q_15_4_1: {
                    prompt: "Cochez toutes les pièces naturelles détachées de taille moyenne dans cet espace de jeu",
                },
                q_15_5: {
                    prompt: "a des **pièces naturelles mobiles plus grandes et plus lourdes** qui peuvent nécessiter de l’aide pour être déplacées/manipulées (p. ex.  bûches ; grandes branches ; rochers plus lourds ; grandes souches)",
                },
                q_15_5_1: {
                    prompt: "Cochez toutes les grandes pièces naturelles détachées dans cet espace de jeu",
                },
                q_15_6: {
                    prompt: "les enfants sont **autorisés à** **utiliser ensemble des pièces mobiles et/ou des matériaux malléables et/o**u **à les déplacer d’une zone de jeu à une autre**",
                },
            },
        },
        section_16_seating: {
            title: "Assises",
            description:
                "Les assises sont un élément de soutien des aires de jeux. Des assises plus formelles peuvent être davantage utilisées par les adultes qui souhaitent surveiller les enfants. Des assises plus informelles peuvent être utilisées par les enfants pour se reposer, s’asseoir, observer les autres, s’attarder ou socialiser avec leurs pairs, tout en favorisant l’évolution du jeu créatif et imaginatif (exemples d’assises informelles : plateformes, troncs d’arbres, souches, marches, bordures basses surélevées, rochers, tables de pique-nique, assises dans de petits espaces et dans la nature …)",
            instruction: "Lisez chaque affirmation et répondez aux questions. Cet espace de jeu...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer les assises de cet espace de jeu :",
            questions: {
                q_16_1: {
                    prompt: "offre des possibilités de s’asseoir grâce à des** assises formelles** (p. ex. chaises ; bancs ; tabourets ; tables de pique-nique)** et/ou des assises informelles** (p. ex. plateformes/rebords ; souches d’arbres ; troncs d’arbres ; rochers, murets bas surélevés)",
                },
                q_16_1_1: {
                    prompt: "Cochez les sièges formels que vous avez identifiés",
                },
                q_16_2: {
                    prompt: "des assises sont disponibles dans ou **en bordure des zones de jeu principales pour une observation facile** (par les personnes qui s’occupent des enfants ou par d’autres enfants)",
                },
                q_16_2_1: {
                    prompt: "Cochez les sièges informels que vous avez identifiés",
                },
                q_16_3: {
                    prompt: "les assises sont **réparties dans l’ensemble de l’espace de jeu** (p. ex. dans de petits espaces ; dans des zones naturelles ; au sein des structures ou équipements de jeu)",
                },
                q_16_4: {
                    prompt: "il y a des assises qui offrent des possibilités de** s’asseoir et de se rassembler en petits et grands groupes** (p. ex. banc pour 2 à 3 personnes ; amphithéâtre ; pavillon ; tables de pique-nique)",
                },
                q_16_5: {
                    prompt: "il y a des **assises conçues pour favoriser les interactions sociales **(p. ex. disposition circulaire ; disposées face à face à proximité ; table de pique-nique, amphithéâtre) *besoin de plus d’exemples ?",
                },
                q_16_6: {
                    prompt: "comprend des **tables et/ou assises accessibles** (p. ex. sièges avec dossier et/ou accoudoirs ; espace sous les tables pour les fauteuils roulants ; permet le transfert depuis un appareil de mobilité vers l’assise ; surface stable adjacente à d’autres assises pour les appareils de mobilité/poussette)",
                },
                q_16_7: {
                    prompt: "il y a des **équipements de jeu manufacturés qui permettent de s’allonger ou de s’asseoir dessus** (p. ex. filet confortable ; hamac ; assise intégrée à la structure ; plateformes)",
                },
            },
        },
        section_17_amenities: {
            title: "Commodités",
            description:
                "Les commodités sont des éléments de soutien d’une aire de jeux, qui contribuent à la rendre plus attrayante et confortable, en particulier pour les familles, les enfants en situation de handicap et les filles).",
            instruction: "Lisez chaque affirmation et répondez aux questions. Cet espace de jeu...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer les commodités de cet espace de jeu :",
            questions: {
                q_17_1: {
                    prompt: "dispose de **toilettes propres et régulièrement entretenues** qui sont gratuites et ouvertes au public pendant les heures d’ouverture de l’espace de jeu",
                },
                q_17_2: {
                    prompt: "dispose d’au moins** une toilette** (dans chaque bloc de genre, s’ils sont séparés) qui est **accessible** et adaptée à tous les utilisateurs (p. ex. pour les personnes utilisant des appareils de mobilité ; assez grande pour accueillir deux personnes ; avec table à langer pour bébés et/ou adultes avec système de transfert)",
                },
                q_17_3: {
                    prompt: "dispose de** fontaines d’eau potable** ou de stations de remplissage faciles à utiliser, installées à une hauteur accessible ou/à différentes hauteurs, sur une surface accessible",
                },
            },
        },
        section_18_topography_surfaces: {
            title: "Topographie et surfaces",
            description:
                "La topographie et les surfaces comprennent les collines, pentes, dépressions et marches du terrain. Elles offrent une variété de jeux comme courir, rouler vers le bas, faire rouler des objets vers le bas, conduire, grimper, garder l’équilibre, faire de la luge, glisser, profiter d’un point de vue et faire l’expérience des hauteurs, sauter/plonger/rouler dans ou par-dessus des flaques, …)",
            instruction: "Lisez chaque affirmation et répondez aux questions. Cet espace de jeu...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer la topographie et les surfaces de cet espace de jeu :",
            questions: {
                q_18_1: {
                    prompt: "présente une** topographie** offrant **des différences de pente, d’inclinaison et/ou de hauteur** (p. ex. collines ; buttes ; creux ; vallées ; crêtes)",
                },
                q_18_2: {
                    prompt: "présente des** surfaces au sol** qui offrent **différents types de possibilités de jeu** (p. ex. herbe, asphalte/béton, caoutchouc, gravier fin, paillis)",
                },
                q_18_3: {
                    prompt: "présente des **inclinaisons ou pentes avec des surfaces plus souples** (p. ex. herbe, sable, gazon) qui permettent de glisser/rouler confortablement avec son corps vers le bas",
                },
                q_18_4: {
                    prompt: "présente des** inclinaisons ou pentes avec des surfaces plus dures / compactes** (p. ex. caoutchouc, asphalte) qui permettent de descendre avec un équipement à roues (p. ex. vélo, trottinette, planche à roulettes) ou d’y glisser (p. ex. avec une luge, une soucoupe, une bouée)",
                },
                q_18_5: {
                    prompt: "présente une **topographie offrant des surfaces / un terrain irréguliers** à escalader ou sur lesquels garder l’équilibre (p. ex. gros rochers ; ruisseau de pierres ; escalier en souches ou en pierre ; bosses, rebords en bois servant de limites, bordures surélevées indiquant les zones de l’espace de jeu)",
                },
                q_18_6: {
                    prompt: "présente des éléments offrant des** dépressions** pouvant potentiellement recueillir de l’eau / de la neige / des feuilles pour le jeu (p. ex. canaux de pluie, ruisseaux, creux ou dépressions concaves)",
                },
            },
        },
        section_19_novelty: {
            title: "Nouveauté",
            description:
                "La nouveauté évalue si l’espace de jeu offre des expériences surprenantes, changeantes, exploratoires ou inhabituelles qui maintiennent l’intérêt du jeu au fil du temps.",
            instruction: "Lisez chaque affirmation et répondez aux questions. Cet espace de jeu...",
            notesPrompt:
                "Des commentaires ? Décrivez une ou plusieurs recommandations pour améliorer la nouveauté de cet espace de jeu :",
            questions: {
                q_19_1: {
                    prompt: "présente des éléments qui offrent des** possibilités de jeu évolutives grâce à des** **éléments réagissant aux conditions météorologiques **(p. ex. carillons ou tambours activés par le vent ou la pluie ; creux qui créent des flaques temporaires après la pluie ; lits de ruisseaux asséchés qui changent pendant/après les précipitations ; collines et pentes adaptées à la glisse/à la luge après une chute de neige)",
                },
                q_19_2: {
                    prompt: "propose des éléments qui offrent** des possibilités de jeu évolutives selon les changements saisonniers locaux** (p. ex., des arbres feuillus qui changent de couleur; des arbres qui perdent leurs feuilles/graines (p. ex. glands); des arbres fruitiers comme les châtaigniers/pommiers; des plantes à fleurs; des étangs qui gèlent en hiver; des jardins avec des fruits et herbes de saison)",
                },
                q_19_3: {
                    prompt: "propose des éléments qui **tirent parti du soleil, de la lumière naturelle changeante et/ou de l’éclairage électronique** — créant des expériences sensorielles et des possibilités de jeu grâce à des éléments réactifs à la lumière (p. ex., panneaux en vitrail; éléments illuminés; éléments créant des ombres à motifs ou en mouvement)",
                },
                q_19_4: {
                    prompt: "propose** des éléments interactifs et/ou basés sur des capteurs** que les enfants peuvent activer pour modifier ou façonner l’environnement de jeu (p. ex., des éléments de mélange de matériaux comme des pompes à eau; des éléments sonores/lumineux/aquatiques activés par le mouvement ou une minuterie)",
                },
                q_19_5: {
                    prompt: "propose des éléments qui permettent aux enfants de **faire l’expérience de différentes hauteurs**, y compris de grandes hauteurs (p. ex. une « grande » colline; une tour ou un belvédère; un grand toboggan; un mur d’escalade; des arbres sur lesquels grimper)",
                },
                q_19_6: {
                    prompt: "propose des** limites/bordures** autour des aires de jeu **avec des possibilités de jeu intégrées** (p. ex. une haie avec laquelle on peut jouer; des souches/rochers entourant une aire de jeu permettant de sauter/courir dessus; des éléments interactifs ou des ouvertures de coucou dans les clôtures/séparateurs d’espace)",
                },
                q_19_7: {
                    prompt: "propose des éléments qui **attirent une faune appropriée** (p. ex. des plantes à fleurs qui attirent les insectes; des mangeoires à oiseaux, maisons à papillons ou hôtels à insectes; des creux dans les rochers pouvant devenir des bains d’oiseaux temporaires; des pierres soulevables pour trouver des insectes et des vers)",
                },
                q_19_8: {
                    prompt: "propose des éléments qui **déclenchent ou invitent à l’exploration** (p. ex. des espaces/ouvertures où regarder dedans ou derrière; des tunnels ou sentiers avec des fins cachées; des éléments de coucou; des sons/musiques qui encouragent la découverte)",
                },
            },
        },
        section_20_sensory_qualities_regulation: {
            title: "Qualités sensorielles et autorégulation",
            description:
                "Qualités sensorielles et autorégulation évalue dans quelle mesure un espace soutient diverses expériences sensorielles qui favorisent l’engagement, le confort et le bien‑être. Elle tient compte de la présence d’éléments visuels, auditifs, olfactifs et tactiles qui créent de l’intérêt et de la stimulation — comme des touches de couleur, des textures variées, des sons, des odeurs agréables et des éléments interactifs. Elle évalue aussi si l’environnement offre des options de retrait sensoriel ou de stimulation réduite, ainsi que toute pollution sonore persistante (codage inversé), afin de garantir que l’espace convienne aux personnes ayant des besoins sensoriels variés.",
            instruction: "Lisez chaque énoncé et répondez aux questions. Cet espace de jeu...",
            notesPrompt:
                "Des commentaires? Décrivez une ou plusieurs recommandations pour améliorer les qualités sensorielles de cet espace de jeu :",
            questions: {
                q_20_1: {
                    prompt: "intègre de la **couleur de manière à créer un intérêt visuel** (p. ex. éléments de jeu colorés ou accents; art; plantes à fleurs)",
                },
                q_20_2: {
                    prompt: "offre **d’autres formes d’intérêt visuel grâce à des motifs, textures, lumières ou mouvements variés **(p. ex. marquages au sol; miroirs/surfaces réfléchissantes; sculptures/éléments artistiques; végétation diversifiée)",
                },
                q_20_3: {
                    prompt: "a une végétation qui procure** des odeurs agréables** (p. ex. fleurs; herbes; plantes ou arbres fruitiers; buissons de lavande; eucalyptus)",
                },
                q_20_4: {
                    prompt: "offre des possibilités **d’entendre ou de créer des sons** (p. ex. instruments de musique; dispositifs sonores activés par le mouvement/le poids; carillons éoliens; tubes parlants; eau courante; sons de la faune; bruissement des herbes)",
                },
                q_20_5: {
                    prompt: "offre** des expériences tactiles grâce à différentes textures, matériaux et/ou vibrations **(p. ex. jeux avec le sable ou la boue; végétation à texture douce; éléments musicaux qui vibrent)",
                },
                q_20_6: {
                    prompt: "a** des endroits pour se retirer ou se soustraire** à la stimulation sensorielle (p. ex., petits espaces ou espaces fermés; zones riches en nature; espaces calmes isolés; zones calmes/passives séparées des zones bruyantes/actives)",
                },
                q_20_7: {
                    prompt: "présente une **pollution sonore constante** (p. ex. circulation dense, trains ou musique forte; vents omniprésents; bruits imprévisibles) [cet élément doit être codé à l’inverse]",
                },
            },
        },
        section_21_accommodating_diverse_abilities: {
            title: "Prise en compte de diverses capacités",
            description:
                "Prise en compte de diverses capacités examine dans quelle mesure un espace de jeu répond efficacement aux besoins des enfants ayant des besoins physiques, sensoriels et de communication variés. Elle tient compte de l’accessibilité, de l’utilisabilité, des aides à la communication, des transitions et de la participation inclusive pour un large éventail de capacités.",
            instruction: "Lisez chaque énoncé et répondez aux questions. Cet espace de jeu...",
            notesPrompt:
                "Des commentaires? Décrivez une ou plusieurs recommandations pour améliorer cet espace de jeu pour différents âges et capacités.",
            questions: {
                q_21_1: {
                    prompt: "dispose d’un **stationnement accessible** (pour véhicules motorisés et/ou vélos)",
                },
                q_21_2: {
                    prompt: "dispose** de tableaux de communication numériques ou analogiques*** qui aident les enfants à communiquer leurs besoins et leurs souhaits (le tableau de communication devrait refléter les possibilités de jeu et les commodités offertes dans l’espace de jeu)* Not to JL/TM: might need rewording, does everyone understand communication board",
                },
                q_21_3: {
                    prompt: "a des **bordures ou points d’accès accessibles (de plain-pied ou par rampe) entre le chemin principal et les surfaces de jeu accessibles ou directement vers les éléments de jeu**.",
                },
                q_21_4: {
                    prompt: "a des **éléments de jeu manufacturés accessibles qui sont isolés** des autres aires de jeu ou derrière des clôtures ou barrières visuelles (p. ex., balançoires pour fauteuil roulant clôturées) [needs reversed coded]",
                },
                q_21_5: {
                    prompt: "les éléments de jeu **facilitent les transitions pour entrer et sortir** (p. ex., rampes d’entrée/de sortie; espace suffisant et/ou plateformes pour effectuer un transfert depuis un appareil de mobilité; glissades avec zones de sortie prolongées à la base pour faciliter le transfert)",
                },
                q_21_6: {
                    prompt: "les éléments de jeu ont **des mains courantes et des prises pour faciliter les transitions** **et la stabilité**, faciles à utiliser pour les enfants ayant différentes capacités (p. ex., situées à différentes hauteurs; tailles et formes adaptées à des mains de différentes tailles)",
                },
                q_21_7: {
                    prompt: "les éléments de jeu permettent l’**utilisation à partir de diverses positions du corps**, en offrant un soutien approprié aux enfants ayant des besoins différents (p. ex., options pour s’asseoir, se tenir debout ou s’allonger; sièges ou balançoires avec soutien complet du corps, bases larges et/ou sangles sécurisées; repose-pieds pour que les pieds n’aient pas à pendre)",
                },
                q_21_8: {
                    prompt: "offre **un accès accessible aux points les plus élevés** et/ou aux éléments de jeu les plus « cool » ou les plus uniques",
                },
                q_21_9: {
                    prompt: "présente des **indicateurs clairs, tactiles et/ou visuels** (p. ex. contrastes de couleurs, changements de matériau ou surfaces texturées/à relief, bordures basses surélevées) pour définir les bords des chemins ou signaler des changements importants de hauteur (p. ex. bords d’une plateforme surélevée) ou les transitions vers de nouveaux espaces (p. ex. vers les zones de balançoires)",
                },
                q_21_10: {
                    prompt: "présente des repères tactiles et/ou visuels clairs (p. ex. contrastes de couleur ; changements de matériau ; surfaces texturées ou à reliefs ; bordures basses surélevées) pour définir les bords des chemins, signaler des changements de hauteur importants ou indiquer les transitions vers de nouveaux espaces",
                },
            },
        },
        section_22_playspace_suitability_for_diverse_users: {
            title: "Adéquation de l’aire de jeu pour divers utilisateurs",
            description:
                "L’adéquation de l’aire de jeu pour divers utilisateurs évalue dans quelle mesure l’espace de jeu est conçu pour répondre aux besoins des enfants de tous âges et de différentes capacités.",
            instruction: "Lisez chaque énoncé et répondez aux questions. Cette aire de jeu...",
            notesPrompt:
                "Des commentaires? Décrivez une ou plusieurs recommandations pour améliorer cette aire de jeu pour des enfants d’âges et de capacités variés.",
            questions: {
                q_22_1: {
                    prompt: "répond aux besoins des **enfants âgés de 0 à 5 ans**",
                },
                q_22_2: {
                    prompt: "répond aux besoins des **enfants âgés de 6 à 12 ans**",
                },
                q_22_3: {
                    prompt: "répond aux besoins des **enfants âgés de 13 ans ou plus **",
                },
                q_22_4: {
                    prompt: "répond aux besoins des **enfants ayant des handicaps physiques** (p. ex. enfants utilisant des aides à la mobilité comme des marchettes et des fauteuils roulants, enfants ayant une force musculaire limitée,...)",
                },
                q_22_5: {
                    prompt: "répond aux besoins des **enfants ayant une déficience visuelle, y compris la cécité et la basse vision**.",
                },
                q_22_6: {
                    prompt: "répond aux besoins des **enfants sourds ou malentendants** (p. ex. enfants utilisant des appareils ou implants auditifs, enfants ayant une perte auditive).",
                },
                q_22_7: {
                    prompt: "répond aux besoins des **enfants ayant une déficience intellectuelle ou un trouble du développement** (p. ex. besoins de soutien à l’apprentissage ou cognitif).",
                },
            },
        },
    },
} satisfies InstrumentTranslations;
