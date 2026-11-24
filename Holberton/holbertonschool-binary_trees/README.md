# Arbres binaires – Holberton School

Petite bibliothèque C implémentant des opérations de base sur les arbres binaires, utilisée pour apprendre les structures de données et la récursivité.

## Fichiers

- `binary_trees.h` – définition de la structure `binary_tree_t` et prototypes des fonctions.
- `binary_tree_print.c` – fonction utilitaire pour afficher joliment un arbre binaire sur la sortie standard (débogage / exemples).

- `0-binary_tree_node.c` – crée un nouveau nœud d'arbre binaire (`binary_tree_node`).
- `1-binary_tree_insert_left.c` – insère un nœud comme enfant gauche d'un nœud donné (`binary_tree_insert_left`). Si un enfant gauche existe déjà, il devient l'enfant gauche du nouveau nœud.
- `2-binary_tree_insert_right.c` – insère un nœud comme enfant droit d'un nœud donné (`binary_tree_insert_right`). Si un enfant droit existe déjà, il devient l'enfant droit du nouveau nœud.
- `3-binary_tree_delete.c` – supprime entièrement un arbre binaire en libérant récursivement tous les nœuds (`binary_tree_delete`).
- `4-binary_tree_is_leaf.c` – vérifie si un nœud est une feuille (aucun enfant) (`binary_tree_is_leaf`).
- `5-binary_tree_is_root.c` – vérifie si un nœud est la racine (aucun parent) (`binary_tree_is_root`).
- `6-binary_tree_preorder.c` – parcours préfixe, applique une fonction de rappel à la valeur de chaque nœud (`binary_tree_preorder`).
- `7-binary_tree_inorder.c` – parcours infixe, applique une fonction de rappel à la valeur de chaque nœud (`binary_tree_inorder`).
- `8-binary_tree_postorder.c` – parcours postfixe, applique une fonction de rappel à la valeur de chaque nœud (`binary_tree_postorder`).
- `9-binary_tree_height.c` – calcule la hauteur d'un arbre (`binary_tree_height`).
- `10-binary_tree_depth.c` – calcule la profondeur d'un nœud par rapport à la racine (`binary_tree_depth`).
- `11-binary_tree_size.c` – calcule le nombre total de nœuds dans un arbre (`binary_tree_size`).
- `12-binary_tree_leaves.c` – compte le nombre de feuilles dans un arbre (`binary_tree_leaves`).
- `13-binary_tree_nodes.c` – compte le nombre de nœuds non feuilles (avec au moins un enfant) (`binary_tree_nodes`).
- `14-binary_tree_balance.c` – calcule le facteur d'équilibre d'un arbre (hauteur du sous-arbre gauche moins hauteur du sous-arbre droit) (`binary_tree_balance`).
- `15-binary_tree_is_full.c` – vérifie si un arbre est plein (chaque nœud a 0 ou 2 enfants) (`binary_tree_is_full`).
- `16-binary_tree_is_perfect.c` – vérifie si un arbre est parfait (tous les niveaux sont complètement remplis) (`binary_tree_is_perfect`).
- `17-binary_tree_sibling.c` – trouve le frère d'un nœud (autre enfant du même parent) (`binary_tree_sibling`).
- `18-binary_tree_uncle.c` – trouve l'oncle d'un nœud (frère de son parent) (`binary_tree_uncle`).

## Compilation

Exemple (flags Holberton) :

```bash
gcc -Wall -Wextra -Werror -pedantic *.c -o binary_trees
```

Inclure le header dans vos programmes :

```c
#include "binary_trees.h"
```
