DIALECTIX DEVELOPMENT RULES

Architecture actuelle :
App.jsx = monolithe MVP fonctionnel.
Ne pas découper sans validation humaine.

Règles obligatoires :

1
Ne jamais modifier la logique ELO.

2
Ne jamais modifier scoring IA.

3
Ne jamais modifier Supabase functions.

4
Ne pas ajouter de librairies sans nécessité.

5
Toute nouvelle feature doit être ajoutée sans casser :
- profils
- debates
- academies
- ranking

6
Priorité :
stabilité > optimisation

7
Objectif :
MVP fonctionnel avant refactor.

8
Toute modification doit garder fallback localStorage.

Stack :
React
Supabase
Anthropic

Principe :
Additive development only.
No destructive refactors.