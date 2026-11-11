/** Integración con GitHub: ajustes del workspace y del proyecto, la sección GitHub y el desarrollo de cada tarea. */
export default {
  // Ajustes del workspace → Integraciones
  Integraciones: 'Integrations',
  'GitHub quedó conectado': 'GitHub is now connected',
  'Esa instalación de GitHub ya está conectada a otro workspace':
    'That GitHub installation is already connected to another workspace',
  'El enlace para conectar caducó. Vuelve a pulsar «Conectar con GitHub».':
    'The link to connect expired. Press “Connect to GitHub” again.',
  'No se pudo conectar con GitHub. Vuelve a intentarlo desde aquí.':
    'Could not connect to GitHub. Try again from here.',
  'Instalas la app de TaskFlow': 'You install the TaskFlow app',
  'En tu organización o tu cuenta de GitHub. Hace falta ser dueño o administrador allá.':
    'In your GitHub organization or account. You need to be an owner or admin there.',
  'Eliges los repositorios': 'You choose the repositories',
  'Todos o solo algunos. TaskFlow no ve los demás, y se puede cambiar después.':
    'All or just some. TaskFlow cannot see the rest, and you can change it later.',
  'Enlazas cada proyecto': 'You link each project',
  'En Ajustes del proyecto → GitHub dices qué repositorios son de ese proyecto.':
    'In Project settings → GitHub you say which repositories belong to that project.',
  'Conecta GitHub': 'Connect GitHub',
  'Cada tarea muestra su rama, sus pull requests y el resultado de sus pipelines, y se mueve sola cuando el PR se abre o se fusiona.':
    'Each task shows its branch, its pull requests and the result of its pipelines, and moves by itself when the PR is opened or merged.',
  'Conectar con GitHub': 'Connect to GitHub',
  'A este servidor le falta la configuración de la GitHub App (identificador, clave privada y secreto de los avisos). Cuando esté, aquí aparece el botón para conectar.':
    'This server is missing the GitHub App configuration (ID, private key and webhook secret). Once it is set, the button to connect appears here.',
  'Conectar GitHub pide el permiso «Configurar GitHub». Pídeselo a quien administra el workspace.':
    'Connecting GitHub requires the “Set up GitHub” permission. Ask whoever manages the workspace.',
  'organización {name}': 'organization {name}',
  'cuenta {name}': 'account {name}',
  'instalada por {name} el {date}': 'installed by {name} on {date}',
  'último aviso recibido {when}': 'last event received {when}',
  'todavía no ha llegado ningún aviso': 'no events received yet',
  'Lista de repositorios actualizada': 'Repository list updated',
  'No se pudo actualizar': 'Could not update',
  'GitHub quedó desconectado': 'GitHub is now disconnected',
  'No se pudo desconectar': 'Could not disconnect',
  conectado: 'connected',
  'Administrar en GitHub': 'Manage on GitHub',
  Desconectar: 'Disconnect',
  'Repositorios con acceso': 'Repositories with access',
  'TaskFlow solo ve los que elegiste al instalar. Para sumar otro, cámbialo en GitHub.':
    'TaskFlow only sees the ones you chose when installing. To add another, change it on GitHub.',
  'Actualizar lista': 'Refresh list',
  'La app todavía no tiene acceso a ningún repositorio. Elígelos en «Administrar en GitHub» y pulsa «Actualizar lista».':
    'The app has no access to any repository yet. Choose them in “Manage on GitHub” and press “Refresh list”.',
  '¿Desconectar GitHub?': 'Disconnect GitHub?',
  'Se quita la app de TaskFlow de {account} y las tareas dejan de mostrar sus ramas, pull requests y pipelines. Las reglas y automatizaciones de los proyectos se pierden. En GitHub no se borra nada.':
    'The TaskFlow app is removed from {account} and tasks stop showing their branches, pull requests and pipelines. Project rules and automations are lost. Nothing is deleted on GitHub.',
  privado: 'private',
  público: 'public',
  'rama principal {branch}': 'default branch {branch}',
  '{repository} enlazado a {project}': '{repository} linked to {project}',
  'Enlazar a un proyecto': 'Link to a project',
  '+ otro proyecto': '+ another project',
  'Enlazar {repository} a': 'Link {repository} to',
  'Leer ramas, commits y pull requests': 'Read branches, commits and pull requests',
  'para enlazarlos con las tareas': 'to link them to tasks',
  'Leer el resultado de los checks y de Actions': 'Read the result of checks and Actions',
  'para mostrar si el pipeline pasó': 'to show whether the pipeline passed',
  'Crear ramas': 'Create branches',
  'con el botón «Crear rama» de la tarea': 'with the task’s “Create branch” button',
  'Ejecutar workflows': 'Run workflows',
  'con el botón «Ejecutar workflow» y las reglas del proyecto':
    'with the “Run workflow” button and the project’s rules',
  'Fusionar o cerrar pull requests': 'Merge or close pull requests',
  'Borrar ramas ni escribir código': 'Delete branches or write code',
  'Cambiar los ajustes o los secretos del repositorio': 'Change the repository’s settings or secrets',
  'Lo que TaskFlow puede hacer en GitHub': 'What TaskFlow can do on GitHub',
  'Lo que no puede': 'What it cannot do',
  'Quién configura GitHub y quién ejecuta workflows se decide en Roles, con los permisos «Configurar GitHub» y «Ejecutar workflows». Ver la sección GitHub lo da el acceso al proyecto.':
    'Who sets up GitHub and who runs workflows is decided in Roles, with the “Set up GitHub” and “Run workflows” permissions. Seeing the GitHub section comes with access to the project.',

  // Ajustes del proyecto → GitHub
  'Puedes ver cómo está configurado. Cambiarlo pide el permiso «Configurar GitHub».':
    'You can see how it is set up. Changing it requires the “Set up GitHub” permission.',
  'Este workspace no está conectado con GitHub': 'This workspace is not connected to GitHub',
  'Primero se conecta el workspace; después cada proyecto elige sus repositorios aquí.':
    'The workspace is connected first; then each project chooses its repositories here.',
  'Ir a Integraciones': 'Go to Integrations',
  'Repositorios de este proyecto': 'Repositories of this project',
  'Sus ramas, PR y pipelines se enlazan con las tareas que nombren: {code} en la rama, o en el título o la descripción del PR.':
    'Their branches, PRs and pipelines are linked to the tasks they name: {code} in the branch, or in the PR title or description.',
  'Enlazar repositorio': 'Link repository',
  '{repository} enlazado': '{repository} linked',
  'La app de TaskFlow todavía no tiene acceso a ningún repositorio. Se eligen en GitHub, desde Ajustes del workspace → Integraciones.':
    'The TaskFlow app has no access to any repository yet. They are chosen on GitHub, from Workspace settings → Integrations.',
  'Este proyecto todavía no tiene repositorios. Enlaza uno para ver sus ramas y pull requests en las tareas.':
    'This project has no repositories yet. Link one to see its branches and pull requests on tasks.',
  'Quitar {name}': 'Remove {name}',
  '{repository} ya no es de este proyecto': '{repository} no longer belongs to this project',
  'Se crea la rama de la tarea': 'The task’s branch is created',
  'Desde TaskFlow o con el código de la tarea en el nombre. Solo si la tarea no había empezado.':
    'From TaskFlow or with the task code in its name. Only if the task had not started.',
  'Se abre el pull request': 'The pull request is opened',
  'Un PR en borrador no cuenta hasta que se marca listo para revisar.':
    'A draft PR does not count until it is marked ready for review.',
  'Se fusiona el pull request': 'The pull request is merged',
  'Si a la tarea le faltan criterios de aceptación, no se completa sola: avisa a quien la tiene asignada.':
    'If the task still has acceptance criteria pending, it is not completed automatically: its assignees are notified.',
  'Se cierra el pull request sin fusionar': 'The pull request is closed without merging',
  'Solo si la tarea seguía en curso.': 'Only if the task was still in progress.',
  'La tarea sigue al pull request': 'The task follows the pull request',
  'Cada cambio queda en la actividad de la tarea como hecho por GitHub, automático.':
    'Each change is recorded in the task’s activity as done by GitHub, automatically.',
  'Estado al que pasa la tarea cuando: {when}': 'State the task moves to when: {when}',
  'no se mueve': 'does not move',
  'Nombre de las ramas que crea TaskFlow': 'Name of the branches TaskFlow creates',
  'todavía no se ha ejecutado': 'has not run yet',
  'última vez {when} · {state}': 'last run {when} · {state}',
  'Regla quitada': 'Rule removed',
  'Reglas de GitHub Actions': 'GitHub Actions rules',
  'Cuando pasa algo en una tarea, TaskFlow le pide a GitHub que ejecute un workflow. El resultado se ve en la tarea y en GitHub → Actions.':
    'When something happens on a task, TaskFlow asks GitHub to run a workflow. The result shows on the task and in GitHub → Actions.',
  'Nueva regla': 'New rule',
  'Enlaza un repositorio para poder crear reglas.': 'Link a repository to be able to create rules.',
  'Este proyecto todavía no tiene reglas.': 'This project has no rules yet.',
  cuando: 'when',
  ejecutar: 'run',
  en: 'in',
  sobre: 'on',
  'Quitar la regla «{name}»': 'Remove the rule “{name}”',
  'Si el workflow ya corre solo al hacer push a main, no hace falta una regla: GitHub lo lanza al fusionar y TaskFlow lo muestra en la tarea. Las reglas sirven para lo que GitHub no sabe, como «la tarea quedó completada». Solo se pueden elegir workflows que acepten ejecución manual (workflow_dispatch).':
    'If the workflow already runs by itself on push to main, no rule is needed: GitHub starts it on merge and TaskFlow shows it on the task. Rules are for what GitHub does not know, like “the task was completed”. Only workflows that accept manual runs (workflow_dispatch) can be chosen.',
  'Regla creada': 'Rule created',
  'No se pudo crear la regla': 'Could not create the rule',
  'Cuándo se ejecuta': 'When it runs',
  'Leyendo workflows…': 'Reading workflows…',
  'Elige un workflow': 'Choose a workflow',
  'No se pudieron leer los workflows de GitHub. Vuelve a intentarlo en un momento.':
    'Could not read the workflows from GitHub. Try again in a moment.',
  'Ese repositorio no tiene workflows que acepten ejecución manual. Agrégale «workflow_dispatch» a su «on:» y vuelve a intentarlo.':
    'That repository has no workflows that accept manual runs. Add “workflow_dispatch” to its “on:” and try again.',
  'Guardar regla': 'Save rule',
  '{count} PR abierto': '{count} open PR',
  '{count} PR abiertos': '{count} open PRs',
  'código-título': 'code-title',
  'tipo/código-título': 'type/code-title',
  'solo el código': 'code only',
  'se fusiona el PR de una tarea': 'a task’s PR is merged',
  'una tarea pasa a completada': 'a task becomes completed',
  'al fusionar el PR de una tarea': 'when a task’s PR is merged',
  'al completar una tarea': 'when a task is completed',

  // Sección GitHub del proyecto
  'Este proyecto todavía no tiene repositorios': 'This project has no repositories yet',
  'Enlaza los repositorios del proyecto y aquí verás sus pull requests, sus pipelines y la tarea de cada uno.':
    'Link the project’s repositories and you will see their pull requests, their pipelines and the task of each one here.',
  'Al conectarlo, cada tarea muestra su rama, sus pull requests y el resultado de sus pipelines.':
    'Once connected, each task shows its branch, its pull requests and the result of its pipelines.',
  'Enlazar repositorios': 'Link repositories',
  'Conectar GitHub': 'Connect GitHub',
  'Lo configura quien tiene el permiso «Configurar GitHub».':
    'It is set up by whoever has the “Set up GitHub” permission.',
  'Pull requests': 'Pull requests',
  Actions: 'Actions',
  Ramas: 'Branches',
  Abiertos: 'Open',
  Fusionados: 'Merged',
  Todos: 'All',
  Repositorio: 'Repository',
  'Repositorio: todos': 'Repository: all',
  'Persona: todas': 'Person: all',
  'un PR se enlaza solo si su rama, su título o su descripción nombran la tarea ({code})':
    'a PR links itself if its branch, title or description names the task ({code})',
  'No hay pull requests abiertos': 'No open pull requests',
  'No hay pull requests': 'No pull requests',
  'Cuando alguien abra uno en un repositorio del proyecto, aparece aquí con su tarea.':
    'When someone opens one in a repository of the project, it appears here with its task.',
  'sin tarea · enlazar': 'no task · link',
  'sin tarea': 'no task',
  'Pull request #{number} enlazado a {code}': 'Pull request #{number} linked to {code}',
  'Pull request #{number} sin tarea': 'Pull request #{number} has no task',
  'No se pudo enlazar': 'Could not link',
  'Todavía no hay ramas enlazadas a tareas': 'No branches linked to tasks yet',
  'Crea la rama desde una tarea, o pon el código de la tarea ({code}) en el nombre de la tuya.':
    'Create the branch from a task, or put the task code ({code}) in the name of yours.',
  abierto: 'open',
  borrador: 'draft',
  fusionado: 'merged',
  'fusionado · tarea completada': 'merged · task completed',
  'en borrador': 'draft',
  'sin revisores': 'no reviewers',
  'revisión pedida a {names}': 'review requested from {names}',
  '{count} de {total} falló': '{count} of {total} failed',
  '{count} de {total} fallaron': '{count} of {total} failed',
  '{count} de {total} pasó': '{count} of {total} passed',
  '{count} de {total} pasaron': '{count} of {total} passed',

  // Actions
  Workflow: 'Workflow',
  'Workflow: todos': 'Workflow: all',
  Rama: 'Branch',
  'Rama: todas': 'Branch: all',
  'Resultado: todos': 'Result: all',
  correcto: 'success',
  falló: 'failed',
  'en cola': 'queued',
  cancelada: 'cancelled',
  omitida: 'skipped',
  pedida: 'requested',
  pasó: 'passed',
  omitido: 'skipped',
  '{rules} · se configuran en {link}': '{rules} · set up in {link}',
  'Ajustes del proyecto → GitHub': 'Project settings → GitHub',
  '{count} regla activa': '{count} active rule',
  '{count} reglas activas': '{count} active rules',
  'Ejecuciones de GitHub Actions': 'GitHub Actions runs',
  'Todavía no hay ejecuciones': 'No runs yet',
  'Ninguna ejecución con esos filtros': 'No runs match those filters',
  'Aquí aparece cada workflow que corre en los repositorios del proyecto, lo lance GitHub o TaskFlow.':
    'Every workflow that runs in the project’s repositories appears here, whether GitHub or TaskFlow started it.',
  'cada ejecución abre su registro en GitHub · reintentar y cancelar piden el permiso «Ejecutar workflows»':
    'each run opens its log on GitHub · re-running and cancelling require the “Run workflows” permission',
  'Se pidió repetir «{name}»': 'Asked to re-run “{name}”',
  'No se pudo reintentar': 'Could not re-run',
  'Se pidió cancelar «{name}»': 'Asked to cancel “{name}”',
  'No se pudo cancelar': 'Could not cancel',
  'regla: {trigger}': 'rule: {trigger}',
  'regla del proyecto': 'project rule',
  'a mano · {name}, desde TaskFlow': 'manual · {name}, from TaskFlow',
  'a mano · {name}': 'manual · {name}',
  'a mano': 'manual',
  'pull request #{number}': 'pull request #{number}',
  'pull request': 'pull request',
  programada: 'scheduled',
  '{seconds} s': '{seconds} s',
  '{minutes} min {seconds} s': '{minutes} min {seconds} s',
  'Ejecutar workflow': 'Run workflow',
  'Lo lanza GitHub Actions en el repositorio; aquí queda quién lo pidió y su resultado.':
    'GitHub Actions runs it in the repository; who requested it and its result are kept here.',
  'solo aparecen los que aceptan ejecución manual (workflow_dispatch)':
    'only those that accept manual runs (workflow_dispatch) appear',
  'dato que pide el workflow': 'input the workflow asks for',
  'Tarea relacionada': 'Related task',
  opcional: 'optional',
  Ejecutar: 'Run',
  'Se pidió ejecutar «{name}» en {branch}': 'Asked to run “{name}” on {branch}',
  'No se pudo ejecutar': 'Could not run',
  'Buscar una tarea…': 'Search for a task…',

  // Desarrollo de la tarea
  Desarrollo: 'Development',
  '+ crear rama': '+ create branch',
  '+ enlazar otra rama o PR': '+ link another branch or PR',
  'Todavía no hay rama ni pull request. Crea la rama aquí, o nombra {code} en la tuya y se enlaza sola.':
    'No branch or pull request yet. Create the branch here, or name {code} in yours and it links itself.',
  'Enlazar una que ya existe': 'Link an existing one',
  'Crear rama': 'Create branch',
  'Nombre de la rama copiado': 'Branch name copied',
  'Copiar nombre': 'Copy name',
  'No se pudo copiar': 'Could not copy',
  'abierto por {name}': 'opened by {name}',
  'ver en GitHub': 'view on GitHub',
  'Checks del pull request': 'Pull request checks',
  'Rama {branch} creada': 'Branch {branch} created',
  'No se pudo crear la rama': 'Could not create the branch',
  'Crear rama para {code}': 'Create branch for {code}',
  'Se crea en GitHub y queda enlazada a la tarea.': 'It is created on GitHub and linked to the task.',
  'A partir de': 'From',
  'Nombre de la rama': 'Branch name',
  'con el código de la tarea al principio, para que el PR se enlace solo':
    'with the task code first, so the PR links itself',
  'usa letras, números, guiones, puntos y barras, sin espacios':
    'use letters, numbers, hyphens, dots and slashes, no spaces',
  'Pasar la tarea a «{state}»': 'Move the task to “{state}”',
  'Comando copiado': 'Command copied',
  'Rama {branch} enlazada': 'Branch {branch} linked',
  'Enlazar una rama o un pull request a {code}': 'Link a branch or a pull request to {code}',
  'Para lo que no nombra a la tarea. Lo que sí la nombra se enlaza solo.':
    'For what does not name the task. What does name it links itself.',
  'Pull requests abiertos sin tarea': 'Open pull requests with no task',
  'No hay ninguno.': 'There are none.',
  'Leyendo ramas…': 'Reading branches…',
  'Elige una rama': 'Choose a branch',
  'Enlazar rama': 'Link branch',
  '{count} rama': '{count} branch',
  '{count} ramas': '{count} branches',
  '{count} PR': '{count} PR',

  // Indicador en el tablero y la lista
  rama: 'branch',
  '{branch} · sin pull request': '{branch} · no pull request',
  '{pr} · desplegando': '{pr} · deploying',
  'PR {pr} fusionado · hay un workflow en curso': 'PR {pr} merged · a workflow is running',
  '{pr} · fusionado': '{pr} · merged',
  'PR {pr} fusionado': 'PR {pr} merged',
  '{pr} · cerrado': '{pr} · closed',
  'PR {pr} cerrado sin fusionar': 'PR {pr} closed without merging',
  '{pr} · falló': '{pr} · failed',
  'PR {pr} {state} · los checks fallaron': 'PR {pr} {state} · checks failed',
  '{pr} · en curso': '{pr} · running',
  'PR {pr} {state} · checks en curso': 'PR {pr} {state} · checks running',
  '{pr} · borrador': '{pr} · draft',
  'PR {pr} en borrador': 'PR {pr} is a draft',
  '{pr} · pasó': '{pr} · passed',
  'PR {pr} abierto · los checks pasaron': 'PR {pr} open · checks passed',
  'PR {pr} abierto': 'PR {pr} open',

  // Actividad
  'enlazó la rama {branch}': 'linked the branch {branch}',
  'abrió el pull request #{number}': 'opened pull request #{number}',
  'fusionó el pull request #{number}': 'merged pull request #{number}',
  'cerró el pull request #{number} sin fusionar': 'closed pull request #{number} without merging',
  'el check {names} falló en el PR #{number}': 'the check {names} failed on PR #{number}',
  'los checks fallaron en el PR #{number}': 'the checks failed on PR #{number}',
  'actualizó la tarea desde GitHub': 'updated the task from GitHub',
  'pasó la tarea de «{from}» a «{to}», automático': 'moved the task from “{from}” to “{to}”, automatically',
  'automático [[actividad]]': 'automatically',
  '{event} · en [[actividad]]': '{event} · on',

  // La cuenta de GitHub de cada persona
  'No se pudo consultar tu cuenta de GitHub.': 'Could not check your GitHub account.',
  'Conectar mi cuenta': 'Connect my account',
  'Conectar mi cuenta de GitHub': 'Connect my GitHub account',
  'Crear la rama de una tarea': 'Create a task’s branch',
  'si puedes editar tareas': 'if you can edit tasks',
  'Ejecutar, reintentar y cancelar workflows': 'Run, re-run and cancel workflows',
  'si tu rol tiene «Ejecutar workflows»': 'if your role has “Run workflows”',
  'Aparecer con tu nombre y tu foto': 'Appear with your name and photo',
  'en los pull requests que abras y en la actividad de la tarea':
    'on the pull requests you open and in the task’s activity',
  'Tu cuenta de GitHub quedó desconectada': 'Your GitHub account is now disconnected',
  'Cuentas conectadas': 'Connected accounts',
  'Tu cuenta de GitHub le dice a TaskFlow quién eres allá: lo que hagas desde aquí (crear una rama, ejecutar un workflow) sale a tu nombre y solo donde tú tengas acceso.':
    'Your GitHub account tells TaskFlow who you are there: what you do from here (create a branch, run a workflow) is done in your name and only where you have access.',
  conectada: 'connected',
  'conectada el {date}': 'connected on {date}',
  'TaskFlow no ve tus repositorios personales ni actúa fuera de los que el workspace compartió.':
    'TaskFlow cannot see your personal repositories or act outside the ones the workspace shared.',
  'sin conectar': 'not connected',
  'Sin conectarla puedes ver ramas, pull requests y pipelines, pero no crear ramas ni ejecutar workflows.':
    'Without connecting it you can see branches, pull requests and pipelines, but not create branches or run workflows.',
  'Este servidor todavía no tiene configurada la integración con GitHub.':
    'This server does not have the GitHub integration set up yet.',
  '¿Desconectar tu cuenta de GitHub?': 'Disconnect your GitHub account?',
  'Podrás seguir viendo ramas, pull requests y pipelines, pero no crear ramas ni ejecutar workflows hasta que la conectes otra vez. En GitHub no se borra nada.':
    'You will still see branches, pull requests and pipelines, but you will not be able to create branches or run workflows until you connect it again. Nothing is deleted on GitHub.',
  'Para ejecutar, reintentar o cancelar workflows, conecta tu cuenta de GitHub. Ver las ejecuciones no lo necesita.':
    'To run, re-run or cancel workflows, connect your GitHub account. Viewing runs does not need it.',
  'cada ejecución abre su registro en GitHub · reintentar y cancelar piden el permiso «Ejecutar workflows» y tu cuenta de GitHub conectada':
    'each run opens its log on GitHub · re-running and cancelling require the “Run workflows” permission and your GitHub account connected',
  'Para crear la rama desde aquí, conecta tu cuenta de GitHub: la rama se crea a tu nombre.':
    'To create the branch from here, connect your GitHub account: the branch is created in your name.',
  'Conecta primero tu cuenta de GitHub y vuelve a pulsar «Conectar con GitHub».':
    'Connect your GitHub account first and press “Connect to GitHub” again.',
  'Tu cuenta de GitHub no ve esa instalación. Instala la app en una organización o cuenta a la que tengas acceso.':
    'Your GitHub account cannot see that installation. Install the app on an organization or account you have access to.',
  'Primero conecta tu cuenta de GitHub. Así TaskFlow comprueba que la instalación es de alguien de este workspace y no de otra persona.':
    'Connect your GitHub account first. That way TaskFlow checks the installation belongs to someone in this workspace and not to someone else.',
  'A este servidor le falta la configuración de la GitHub App (identificador, clave privada, secreto de los avisos y cliente de OAuth). Cuando esté, aquí aparece el botón para conectar.':
    'This server is missing the GitHub App configuration (ID, private key, webhook secret and OAuth client). Once it is set, the button to connect appears here.',
  'Cuentas de GitHub del equipo': 'The team’s GitHub accounts',
  '{linked} de {total}': '{linked} of {total}',
  'Cada persona conecta la suya desde su perfil. Sin ella puede ver, pero no crear ramas ni ejecutar workflows.':
    'Each person connects their own from their profile. Without it they can view, but not create branches or run workflows.',
  'sin enlazar': 'not linked',
  'No autorizaste la conexión en GitHub': 'You did not authorize the connection on GitHub',
  'Tu cuenta de GitHub (@{login}) quedó conectada': 'Your GitHub account (@{login}) is now connected',
  'No se pudo conectar tu cuenta de GitHub': 'Could not connect your GitHub account',
  'Conectando tu cuenta de GitHub…': 'Connecting your GitHub account…',
  'Conecta tu cuenta de GitHub para ejecutar workflows': 'Connect your GitHub account to run workflows',
}
