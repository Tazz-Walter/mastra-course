# 🗄️ Supabase Agent - Configuración

El `supabase-agent` es un experto en bases de datos PostgreSQL y Supabase que te ayuda con schemas, queries, RLS policies y optimización.

## 🔑 Tipos de Tokens de Supabase

Supabase tiene **3 tipos principales de tokens/keys**:

### 1️⃣ **anon key** (Público)
- ✅ **Para**: Frontend/Cliente (público)
- ✅ **Permisos**: Limitados por Row Level Security (RLS)
- ✅ **Seguro**: Sí, se puede exponer en el frontend
- ❌ **NO usar** para el MCP Agent (muy limitado)

**Ejemplo:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb2plY3QtaWQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY...
```

---

### 2️⃣ **service_role key** (Privado)
- ⚠️ **Para**: Backend/Servidor (NUNCA en frontend)
- ✅ **Permisos**: **Completos** - Bypassa RLS
- ❌ **Peligroso**: Acceso total a la base de datos
- ⚠️ **Usar con cuidado** para el MCP Agent (si necesitas acceso completo al proyecto)

**Ejemplo:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb2plY3QtaWQiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNj...
```

**Dónde encontrarlo:**
1. Ve a tu proyecto en Supabase Dashboard
2. **Settings** → **API**
3. Copia el **`service_role` key** (está oculto, haz click en "Reveal")

---

### 3️⃣ **Personal Access Token** (Recomendado para MCP) ✅
- ✅ **Para**: API de gestión de Supabase (proyectos, organizaciones)
- ✅ **Permisos**: Personalizables por scope
- ✅ **Seguro**: Puedes rotar fácilmente
- ✅ **MEJOR OPCIÓN** para el MCP Agent de Supabase

**Cómo obtenerlo:**

1. **Inicia sesión en Supabase**: https://supabase.com
2. Click en tu avatar (arriba derecha) → **Account Settings**
3. En el menú lateral: **Access Tokens**
4. Click en **Generate New Token**
5. Configuración:
   - **Name**: `Mastra MCP Agent`
   - **Scopes**: Selecciona según lo que necesites:
     - ✅ `all` - Acceso completo (más fácil para empezar)
     - ✅ `projects.read` - Leer proyectos
     - ✅ `projects.write` - Modificar proyectos
     - ✅ `organizations.read` - Leer organizaciones
6. Click **Generate token**
7. **¡COPIA EL TOKEN!** (solo se muestra una vez)

**Ejemplo:**
```
sbp_1234567890abcdef1234567890abcdef1234567890abcdef
```

---

## 📋 Configuración del `.env`

Agrega estas variables a tu archivo `.env`:

```bash
# Supabase MCP Server
SUPABASE_ACCESS_TOKEN=sbp_tu_personal_access_token_aqui
SUPABASE_PROJECT_REF=tu_project_ref_aqui
```

**Dónde encontrar tu Project Ref:**
1. Ve a tu proyecto en Supabase Dashboard
2. **Settings** → **General**
3. Copia el **Reference ID** (formato: `abcdefghijklmnop`)

**⚠️ Importante:**
- **Nunca** hagas commit del `.env` (ya está en `.gitignore`)
- Usa el **Personal Access Token** (sbp_...), NO el anon key
- Si usas `service_role` key, ten MUCHO cuidado (acceso total)
- El servidor se ejecuta en **modo read-only** por defecto (seguro)

---

## 🎯 ¿Qué Token Usar para el MCP Agent?

| Token | Uso Recomendado | Seguridad | Acceso |
|-------|-----------------|-----------|--------|
| **anon key** | ❌ No usar | ✅ Alto | Limitado por RLS |
| **service_role key** | ⚠️ Solo si necesitas acceso total al DB | ❌ Bajo | Total (bypassa RLS) |
| **Personal Access Token** | ✅ **RECOMENDADO** | ✅ Alto | Gestión de proyectos |

### Recomendación:

**Usa Personal Access Token** porque:
- ✅ Acceso controlado por scopes
- ✅ Fácil de rotar
- ✅ Diseñado para integraciones como MCP
- ✅ No expone acceso directo a la base de datos

---

## 🚀 Verificar Configuración

Una vez agregado el token al `.env`:

```bash
npm run build
npm run dev
```

Luego pregúntale al agente:
```
"¿Qué herramientas de Supabase tienes disponibles?"
```

Deberías ver herramientas como:
- `list_projects` - Listar proyectos
- `get_project` - Obtener detalles de proyecto
- `list_tables` - Listar tablas
- `execute_sql` - Ejecutar SQL
- `apply_migration` - Aplicar migración
- `list_extensions` - Listar extensiones
- Y muchas más...

---

## 💡 Casos de Uso del Supabase Agent

### Diseño de Schema
```
"Necesito diseñar un schema para un sistema de blog con usuarios, posts y comentarios"
```

### Queries Complejas
```
"Escribe una query para obtener los 10 posts más populares del último mes con el nombre del autor"
```

### RLS Policies
```
"Crea una RLS policy para que los usuarios solo puedan editar sus propios posts"
```

### Optimización
```
"Esta query es lenta: SELECT * FROM posts WHERE created_at > '2025-01-01'. ¿Cómo la optimizo?"
```

### Migraciones
```
"Genera una migración para agregar una columna 'published_at' a la tabla posts"
```

---

## 🔒 Seguridad y Best Practices

1. **Rotación de Tokens**: Rota tu Personal Access Token cada 90 días
2. **Scopes Mínimos**: Solo otorga los scopes necesarios
3. **Confirmación**: El agente pedirá confirmación antes de operaciones destructivas
4. **Backups**: Siempre haz backup antes de migraciones importantes
5. **Testing**: Prueba queries complejas en un entorno de desarrollo primero

---

## 🆘 Troubleshooting

### "No herramientas disponibles"
- Verifica que `SUPABASE_ACCESS_TOKEN` esté en `.env`
- Asegúrate de usar el Personal Access Token correcto
- Revisa que `SUPABASE_MCP_URL` sea `https://mcp.supabase.com/mcp`

### "Unauthorized" / "Invalid token"
- Regenera el Personal Access Token
- Verifica que no haya espacios extra en el `.env`
- Asegúrate de que el token tenga los scopes necesarios

### "Cannot connect to MCP server"
- Verifica tu conexión a internet
- Revisa que la URL del MCP sea correcta
- Chequea si hay proxies o firewalls bloqueando

---

## 📚 Recursos

- [Supabase MCP Documentation](https://mcp.supabase.com)
- [Supabase API Docs](https://supabase.com/docs/guides/api)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)

