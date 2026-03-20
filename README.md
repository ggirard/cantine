# Cantine - Club Social

Application Angular pour gérer la cantine d'un club social. Les membres se connectent via Google, consomment des produits (débités de leur solde), et les administrateurs gèrent les utilisateurs, produits et soldes.

## Prérequis

- Node.js 22+
- Angular CLI (`npm install -g @angular/cli`)
- Un projet Firebase avec Authentication (Google), Firestore et Storage activés

## Installation

```bash
npm install
```

## Configuration Firebase

Copier le fichier d'environnement et y mettre vos identifiants Firebase :

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
```

Puis modifier `src/environments/environment.ts` avec les valeurs de votre projet Firebase.

## Développement

```bash
ng serve
```

L'application sera disponible sur `http://localhost:4200`.

## Build

```bash
ng build
```

## Déploiement des règles Firebase

Déployer `firestore.rules` et `storage.rules` via la console Firebase ou le CLI Firebase.

## Fonctionnalités

- **Authentification Google** avec pré-provisionnement par email
- **Catalogue** de produits avec achat en un clic
- **Historique** des transactions par utilisateur
- **Administration** : gestion des utilisateurs, produits et soldes
- **Transactions atomiques** via Firestore `runTransaction`
- **Solde négatif autorisé** (avance de fonds)
