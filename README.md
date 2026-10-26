# Chrono Défis KB

Chrono d'intervalles gratuit pour les séances kettlebell « Défis », en une seule page web (HTML, CSS et JavaScript, sans dépendance). Pensé pour un iPhone posé à côté du kettlebell.

## Formats

- **Moteur / Moteur+** : EMOM de 10 ou 12 tours. La voix annonce l'exercice à chaque minute, avec des bips sur les 3 dernières secondes.
- **Circuit** : 3 blocs AMRAP de 8 min, 2 min de repos, bouton « +1 tour ».
- **Tabata** : 20 s à fond, 10 s de repos, 8 fois.
- **Repos 90 s** : minuteur de repos entre deux tours d'un complexe.
- **Chipper** : chronomètre avec temps intermédiaires par étape.

## Utilisation

Ouvre `index.html` dans un navigateur, ou publie le dépôt avec GitHub Pages. Monte le volume avant de démarrer. La page demande à l'appareil de garder l'écran allumé (Wake Lock) ; sur iPhone, règle aussi le verrouillage automatique sur « Jamais » pendant la séance, sinon le chrono peut se figer.

La voix utilise la synthèse vocale du navigateur (français) et les bips utilisent l'API Web Audio. Les réglages Voix et Bips sont mémorisés dans le navigateur.

## Personnaliser

Les exercices du Moteur (`EMOM_EX`), les étapes du Chipper (`CHIPPER`) et la durée des blocs se modifient en haut du script de `index.html`.
