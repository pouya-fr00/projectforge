# Personas and User Journeys

## Persona A — New project developer

Goal: begin product-specific work today.

Journey:

1. reads README value and prerequisites;
2. runs create command;
3. chooses modules or passes flags;
4. sees exact plan;
5. project is generated and verified;
6. opens generated architecture guide;
7. begins feature work.

## Persona B — Existing generated project owner

Goal: add admin later.

1. runs `list` or `explain admin-dashboard`;
2. sees dependencies and files;
3. runs `plan`;
4. reviews dry-run;
5. runs `add`;
6. doctor verifies integration;
7. customizes user-owned pages.

## Persona C — Contributor

Goal: add or improve a module safely.

1. reads module authoring guide;
2. runs generator for module skeleton;
3. defines manifest/schema/docs first;
4. writes composition tests;
5. runs clean-room matrix;
6. opens PR with evidence.

## Journey acceptance

Each journey must be demonstrated in docs and covered by automated or scripted usability tests.
