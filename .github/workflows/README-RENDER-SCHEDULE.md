# Configuración del Workflow de Control de Render

Este documento explica cómo configurar el workflow de GitHub Actions para controlar automáticamente el encendido y apagado de servicios en Render.

## 📋 Pasos para Replicar en Otro Repositorio

### 1. Crear el Archivo del Workflow

Crea el archivo `.github/workflows/render-schedule.yml` con el contenido proporcionado.

### 2. Configurar Secrets en GitHub

Debes agregar dos secrets en tu repositorio de GitHub:

1. Ve a tu repositorio en GitHub
2. Navega a: **Settings** → **Secrets and variables** → **Actions**
3. Haz clic en **New repository secret**
4. Agrega los siguientes secrets:

#### `RENDER_SERVICE_ID`
- **Nombre:** `RENDER_SERVICE_ID`
- **Valor:** El ID de tu servicio en Render
- **Cómo obtenerlo:**
  - Ve a tu dashboard de Render
  - Selecciona tu servicio
  - El ID está en la URL: `https://dashboard.render.com/web/srv-XXXXXXXXXX`
  - Copia solo la parte `srv-XXXXXXXXXX`

#### `RENDER_API_KEY`
- **Nombre:** `RENDER_API_KEY`
- **Valor:** Tu API Key de Render
- **Cómo obtenerlo:**
  - Ve a: https://dashboard.render.com/u/settings
  - En la sección **API Keys**, haz clic en **Create API Key**
  - Dale un nombre descriptivo (ej: "GitHub Actions")
  - Copia el token generado (solo se muestra una vez)

### 3. Ajustar los Horarios

Los horarios están configurados para Ecuador (UTC-5):

```yaml
schedule:
  - cron: "0 4 * * *"   # Apagar a las 23:00 Ecuador (04:00 UTC)
  - cron: "0 12 * * *"  # Encender a las 07:00 Ecuador (12:00 UTC)
```

#### Conversión de Horarios UTC

Para convertir hora local a UTC:
- **Ecuador (UTC-5):** Suma 5 horas
  - 23:00 Ecuador → 04:00 UTC (día siguiente)
  - 07:00 Ecuador → 12:00 UTC

#### Formato Cron

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Día de la semana (0-7, 0 y 7 = Domingo)
│ │ │ └───── Mes (1-12)
│ │ └─────── Día del mes (1-31)
│ └───────── Hora (0-23) en UTC
└─────────── Minuto (0-59)
```

**Ejemplos:**
- `"0 4 * * *"` → Todos los días a las 04:00 UTC
- `"30 14 * * 1-5"` → Lunes a Viernes a las 14:30 UTC
- `"0 */6 * * *"` → Cada 6 horas

### 4. Probar el Workflow

#### Prueba Manual (Recomendado)

1. Ve a tu repositorio en GitHub
2. Navega a: **Actions** → **Control de Servicio Render por Horario**
3. Haz clic en **Run workflow**
4. Selecciona la acción:
   - `suspend` para apagar el servicio
   - `resume` para encender el servicio
5. Haz clic en **Run workflow**
6. Observa los logs para verificar que funciona correctamente

#### Verificar Ejecución Automática

- Los workflows programados aparecerán en la pestaña **Actions**
- Puedes ver el historial de ejecuciones y logs
- GitHub Actions puede tener un retraso de hasta 15 minutos en la ejecución de cron jobs

### 5. Verificar en Render

Después de ejecutar el workflow:

1. Ve a tu dashboard de Render
2. Verifica el estado de tu servicio
3. Deberías ver que el servicio está "Suspended" o "Running" según la acción ejecutada

## 🔧 Personalización

### Cambiar Horarios

Edita las líneas de `cron` en el archivo `.github/workflows/render-schedule.yml`:

```yaml
schedule:
  - cron: "MINUTO HORA * * *"  # Tu horario en UTC
```

### Múltiples Servicios

Para controlar múltiples servicios, puedes:

1. **Opción A:** Crear múltiples workflows (uno por servicio)
2. **Opción B:** Agregar más secrets y pasos en el mismo workflow

### Deshabilitar el Workflow

Si necesitas desactivar temporalmente el workflow:

1. Ve a **Actions** → **Control de Servicio Render por Horario**
2. Haz clic en el menú de tres puntos (⋯)
3. Selecciona **Disable workflow**

## ⚠️ Consideraciones Importantes

1. **Zona Horaria:** GitHub Actions siempre usa UTC. Calcula correctamente la conversión.
2. **Retrasos:** Los cron jobs pueden tener hasta 15 minutos de retraso.
3. **Límites:** GitHub Actions tiene límites de uso en cuentas gratuitas (2000 minutos/mes).
4. **Seguridad:** Nunca incluyas credenciales directamente en el código.
5. **API de Render:** Verifica que tu plan de Render permita el uso de la API.

## 📚 Referencias

- [GitHub Actions - Scheduled Events](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [Render API Documentation](https://api-docs.render.com/)
- [Crontab Guru](https://crontab.guru/) - Herramienta para validar expresiones cron

## 🐛 Solución de Problemas

### El workflow no se ejecuta

- Verifica que el repositorio tenga actividad reciente (GitHub puede deshabilitar workflows en repos inactivos)
- Asegúrate de que el workflow esté en la rama principal (`main` o `master`)

### Error 401 Unauthorized

- Verifica que `RENDER_API_KEY` sea válido
- Regenera el API Key en Render si es necesario

### Error 404 Not Found

- Verifica que `RENDER_SERVICE_ID` sea correcto
- Asegúrate de que el servicio exista en tu cuenta de Render

### El servicio no cambia de estado

- Verifica los logs del workflow en GitHub Actions
- Comprueba que tu plan de Render permita suspender/reanudar servicios
- Algunos tipos de servicios en Render no pueden ser suspendidos
