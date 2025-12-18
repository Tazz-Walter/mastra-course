#!/bin/bash

# Script para ver los scores de evaluación de los agentes
# Uso: npm run view-scores

DB_PATH="./mastra.db"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ No se encontró la base de datos en $DB_PATH"
    echo "💡 Asegúrate de que el servidor haya corrido al menos una vez."
    exit 1
fi

echo "=================================================================================="
echo "📈 RESUMEN DE SCORES POR AGENTE"
echo "=================================================================================="

sqlite3 "$DB_PATH" <<'EOF'
.mode column
.headers on
.width 20 25 10 10 10 10 20

SELECT 
  agent_name as Agente,
  scorer_name as Scorer,
  COUNT(*) as Evals,
  ROUND(AVG(score), 2) as AvgScore,
  ROUND(MIN(score), 2) as MinScore,
  ROUND(MAX(score), 2) as MaxScore,
  MAX(created_at) as Ultima
FROM scores
GROUP BY agent_name, scorer_name
ORDER BY agent_name, scorer_name;
EOF

echo ""
echo "=================================================================================="
echo "📋 ÚLTIMOS 10 SCORES DETALLADOS"
echo "=================================================================================="

sqlite3 "$DB_PATH" <<'EOF'
.mode line
SELECT 
  '🤖 Agente: ' || agent_name as ' ',
  '📊 Scorer: ' || scorer_name as '  ',
  '⭐ Score: ' || score as '   ',
  '💬 Razón: ' || COALESCE(reason, 'N/A') as '    ',
  '🕐 Fecha: ' || created_at as '     '
FROM scores
ORDER BY created_at DESC
LIMIT 10;
EOF

echo ""
echo "=================================================================================="
echo "📊 ESTADÍSTICAS POR SCORER"
echo "=================================================================================="

sqlite3 "$DB_PATH" <<'EOF'
.mode column
.headers on
.width 30 15 15 15

SELECT 
  scorer_name as Scorer,
  COUNT(*) as TotalRuns,
  ROUND(AVG(score), 2) as AvgScore,
  COUNT(DISTINCT agent_name) as Agentes
FROM scores
GROUP BY scorer_name
ORDER BY AvgScore DESC;
EOF

echo ""
echo "=================================================================================="
echo "✅ Consulta completada"
echo "=================================================================================="

