# Chrono Défis KB

Chronomètre pour les séances kettlebell « Défis » (1 kettlebell de 10 kg et le poids du corps).
Application web installable (PWA), utilisable hors ligne, sans compte, sans serveur applicatif et sans mesure d'audience :
toutes les données restent dans le navigateur du téléphone.

En ligne : <https://chronokb.openspec.fr>

> **Sécurité** — reprise après une fracture de la clavicule : douleur > 3/10 = arrêt immédiat, rien de balistique.
> La Phase 2 ne démarre qu'avec l'accord médical. En cas de gêne, utiliser la **version allégée** (voir plus bas).

## Utilisation

1. Onglet **Séances** : choisir une séance (Phase 1, Phase 2 ou un outil).
2. Écran de brief : exercices, record, avertissements ; option **version allégée** pour la Phase 2.
3. **Démarrer** : compte à rebours de départ, puis le chrono. Pendant la séance :
   - gros chiffres, nom de l'exercice, répétitions, tour ou bloc en cours, liste des exercices (l'exercice en cours est surligné) ;
   - bouton principal contextuel : **+1 tour** (AMRAP, avec −1 en cas d'erreur), **Round terminé**, **Palier terminé**, **Étape terminée** (split), **Split** (chrono libre) ;
   - **Pause / Reprendre**, **Passer** (étape suivante), **Terminer** (arrêt anticipé, séance marquée non terminée).
4. **Fin de séance** : durée, tours par bloc, rounds, splits ; douleur de 0 à 10 ; note libre ; récapitulatif texte à copier-coller ; **Enregistrer** dans l'historique.
5. Onglet **Historique** : records par séance, détail de chaque séance, export **CSV** (séparateur `;`, pour Excel/Numbers) et **JSON**, import **JSON** (fusion sans doublon).
6. Onglet **Réglages** : bips, voix, vibration, durée du compte à rebours de départ, test des alertes.

Alertes : bip et vibration à chaque changement d'étape, bips des 3 dernières secondes, annonce vocale (synthèse du navigateur), écran maintenu allumé (Wake Lock).
Sur iPhone, Safari ne gère pas la vibration et le mode silencieux coupe les bips : monter le volume et régler le verrouillage automatique sur « Jamais » le temps de la séance.

## Formats de chrono

| Format | Fonctionnement |
|---|---|
| EMOM | Une minute par exercice, blocs de 3 (Phase 1) ou 4 minutes (Phase 2), nom de l'exercice de la minute et tour en cours |
| AMRAP | Blocs chronométrés, repos entre les blocs, compteur de tours par bloc |
| Rounds | Rounds terminés à l'appui, repos fixe entre les rounds (90 s), finisher en paliers (wood chop) |
| Chipper | Une étape par exercice, temps intermédiaire (split) à chaque étape ; chrono libre = splits à la volée |
| Tabata | 20 s / 10 s, nombre de rounds réglable (outil Tabata) |

Les formats s'enchaînent sans repos dans une même séance (Boss final : chipper puis Tabata).

## Presets

### Phase 1 (9 séances, jusqu'au 11/11/2026)

| Séance | Contenu | Référence |
|---|---|---|
| Moteur | EMOM 3 min × 10 : goblet squat 10, alt bent over row 6/bras, curl press out 6/bras | 30:10 |
| Moteur+ | idem × 12 tours | |
| Complexe | 8 rounds (deadlift, rowing 2 mains, goblet squat, curl press out ×5, march to lunge 5/jambe), repos 90 s, finisher wood chop demi-agenouillé 12-10-8-6-4/côté | |
| Complexe+ | idem | |
| Circuit / Circuit+ | 3 AMRAP de 8 min, 2 min de repos | 12 tours |
| Chipper | goblet squat ×50, deadlift ×40, rowing penché ×30, curl press out ×20, march to lunge ×20, wood chop ×20, avec splits | 13:52 |
| Boss final | Chipper puis Tabata 6 rounds, sans repos | |

### Phase 2 (9 séances dès le 14/11/2026, 1 jour de repos entre deux, à 18 h)

| Séance | Format | Contenu |
|---|---|---|
| S1 Moteur | EMOM 4 min × 9 (36 min) | goblet squat 12, clean + développé strict 6/bras, rowing penché 8/bras, around the world 6/sens |
| S2 Circuit | 3 AMRAP 8 min, repos 2 min | B1 : goblet 12, sumo deadlift 10, squat sauté 8 · B2 : clean-press 6/bras, rowing 8/bras, extension triceps 8, halo 4/sens · B3 : wood chop 8/côté, around the world 6/sens, relevé de jambes 10 |
| S3 Complexe | 8 rounds, repos 90 s | sumo deadlift, rowing 2 mains, goblet squat, clean-press/bras, extension triceps ×5, halo 3/sens ; finisher 12-10-8-6-4 |
| S4 Moteur+ | EMOM 4 min × 10 (40 min) | 14 / 7 / 10 / 8 |
| S5 Circuit+ | 3 AMRAP 9 min | 14/12/10 · 7/10/10/5 · 10/8/12 |
| S6 Complexe+ | 9 rounds | 6 reps (halo 4/sens) ; finisher 14-12-10-8-6 |
| S7 Moteur++ | EMOM 4 min × 11 (44 min) | 15 / 8 / 10 / 8 |
| S8 Circuit++ | 3 AMRAP 10 min | 16/14/12 · 8/10/12/6 · 12/10/15 |
| S9 Complexe++ (Boss final) | 10 rounds | 7 reps (halo 4/sens) ; finisher 16-14-12-10-8 |

**Around the world** : 1 rep = 2 rotations du KB autour de l'abdomen, la seconde finit par un passage de main à hauteur
d'épaule, puis changement de sens.

**Version allégée** : le clean + développé strict devient un curl press out devant ; halo, extensions triceps et around the
world sont retirés (dans un EMOM, la minute retirée devient une minute de repos actif, la durée ne change pas).

### Outils

Tabata (rounds réglables), Repos 90 s, Chrono libre.

## Personnaliser

Les séances sont des données dans `js/presets.js` (une séance = une liste de segments `emom`, `amrap`, `rounds`, `chipper`,
`tabata`, `rest`). Le moteur (`js/engine.js`) ne dépend pas du DOM ; l'historique est dans `js/history.js`.

## Développement

Aucune dépendance, aucun build : HTML, CSS et modules JavaScript.

```bash
npm test            # tests du moteur (EMOM, AMRAP, rounds, chipper, tabata), des presets (durées) et de l'historique (Node ≥ 20)
npm run serve       # http://localhost:8000 (les modules JS ne se chargent pas en ouvrant index.html en file://)
```

## Déploiement

Image `nginx:alpine` (`Dockerfile`, `docker/nginx.conf`) : `index.html`, `sw.js`, le manifeste et `js/` sont servis en
`no-cache`, les icônes en cache 7 jours. Le service worker (`sw.js`) précache toute l'app : après une mise à jour,
**changer `CACHE`** dans `sw.js` ; la nouvelle version s'affiche au lancement suivant.

Sur le serveur openspec.fr, la source est clonée dans `/home/debian/compose/chronokb/src` :

```bash
cd /home/debian/compose/chronokb && git -C src pull && docker compose up -d --build
```

## Données et vie privée

Historique et réglages dans le `localStorage` du navigateur (clés `chronokb.history.v1` et `chronokb.settings.v1`).
Rien n'est envoyé : pas de compte, pas de serveur applicatif, pas de police ni de script tiers, pas de mesure d'audience.
Vider les données du site efface l'historique : l'exporter régulièrement.

## Licence

[MIT](LICENSE)
