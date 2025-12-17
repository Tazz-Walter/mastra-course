# 🐙 GitHub MCP Server - Configuración

El `wally-agent` ahora usa el **GitHub MCP Server oficial** que proporciona acceso directo a 142+ herramientas de GitHub.

## 📋 Requisitos

### 1. Crear GitHub Personal Access Token (PAT)

1. Ve a GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
   
   O usa este link directo: https://github.com/settings/tokens/new

2. **Configura el token:**
   - **Note**: `Mastra Wally Agent MCP` (o el nombre que prefieras)
   - **Expiration**: Recomendado 90 días (para seguridad)
   - **Select scopes**: Marca los permisos que necesites:

### 🔐 Permisos Recomendados (Scopes)

#### Mínimo (Solo lectura):
```
✅ repo (todos los sub-scopes) - Acceso a repositorios
✅ read:org                    - Leer info de organización
✅ read:user                   - Leer perfil de usuario
```

#### Completo (Lectura + Escritura):
```
✅ repo                        - Control total de repos privados
✅ workflow                    - Actualizar GitHub Actions workflows
✅ write:packages              - Subir paquetes
✅ delete:packages             - Borrar paquetes
✅ admin:org                   - Control total de organizaciones
✅ admin:repo_hook             - Control total de hooks
✅ gist                        - Crear gists
✅ notifications               - Acceso a notificaciones
✅ user                        - Actualizar datos de usuario
✅ delete_repo                 - Borrar repositorios
✅ admin:gpg_key              - Gestionar GPG keys
✅ admin:ssh_signing_key      - Gestionar SSH signing keys
```

3. Haz clic en **Generate token** y **copia el token** (solo se muestra una vez).

### 2. Agregar Token al `.env`

Abre tu archivo `.env` y agrega:

```bash
# GitHub MCP Server (oficial)
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_tu_token_aqui_xxxxxxxxxxxxxxxxxx
```

**⚠️ Importante**: 
- El token debe empezar con `ghp_`
- **Nunca** hagas commit del `.env` (ya está en `.gitignore`)
- Guarda el token en un gestor de contraseñas

### 3. Verificar Configuración

Reinicia el servidor y verifica que las herramientas de GitHub estén disponibles:

```bash
npm run dev
```

En el chat del agente, pregunta:
```
"¿qué herramientas de GitHub tienes disponibles?"
```

Deberías ver herramientas como:
- `create_or_update_file`
- `create_issue`
- `create_pull_request`
- `fork_repository`
- `get_file_contents`
- `list_commits`
- `list_issues`
- `list_pull_requests`
- `list_starred_repositories`
- `search_code`
- `search_repositories`
- Y muchas más...

## 🎯 Capacidades del GitHub MCP Server

### Gestión de Repositorios
- Buscar y explorar repos
- Leer archivos y código
- Crear/actualizar archivos
- Crear branches
- Fork repositories
- Listar commits e historial

### Issues & Pull Requests
- Crear, actualizar y cerrar issues
- Gestionar labels y assignees
- Crear y revisar PRs
- Comentar en issues/PRs
- Gestionar milestones

### CI/CD & Workflows
- Monitorear GitHub Actions
- Ver workflow runs
- Analizar build failures
- Gestionar releases

### Code Analysis
- Buscar código con GitHub Code Search
- Revisar security advisories
- Analizar Dependabot alerts
- Review code patterns

### Colaboración
- Gestionar notificaciones
- Acceder a discussions
- Analizar actividad del equipo
- Listar repos con estrellas

## 🔄 Rotación de Token

Por seguridad, rota tu token cada 90 días:

1. Genera un nuevo token con los mismos permisos
2. Actualiza `GITHUB_PERSONAL_ACCESS_TOKEN` en `.env`
3. Revoca el token anterior en GitHub

## 🆚 GitHub MCP vs Zapier GitHub

**GitHub MCP Server oficial** (ahora activo):
- ✅ 142+ herramientas nativas
- ✅ Acceso directo a GitHub API
- ✅ Menor latencia
- ✅ Más features (CI/CD, security, code search, etc.)
- ✅ Gratis (solo necesitas un PAT)

**Zapier GitHub** (puedes mantenerlo si lo necesitas):
- ⚠️ ~15 herramientas básicas
- ⚠️ Requiere intermediario (Zapier)
- ⚠️ Mayor latencia
- ⚠️ Features limitadas
- ⚠️ Puede tener costos según plan

**Recomendación**: Usa GitHub MCP para GitHub, mantén Zapier solo para Gmail y otras integraciones.

## 📚 Más Información

- [GitHub MCP Server Docs](https://mcpservers.org/servers/github/github-mcp-server)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [MCP Protocol](https://modelcontextprotocol.io)

