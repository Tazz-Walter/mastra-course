/**
 * Script para ver los scores de evaluación de los agentes
 * 
 * Uso:
 *   npx tsx scripts/view-scores.ts
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Conecta a la base de datos de Mastra
const dbPath = join(__dirname, '..', 'mastra.db');
console.log(`📊 Conectando a: ${dbPath}\n`);

try {
  const db = new Database(dbPath, { readonly: true });

  // Ver resumen de scores por agente
  console.log('='.repeat(80));
  console.log('📈 RESUMEN DE SCORES POR AGENTE');
  console.log('='.repeat(80));

  const summaryQuery = `
    SELECT 
      agent_name,
      scorer_name,
      COUNT(*) as total_evaluations,
      ROUND(AVG(score), 2) as avg_score,
      ROUND(MIN(score), 2) as min_score,
      ROUND(MAX(score), 2) as max_score,
      MAX(created_at) as last_evaluation
    FROM scores
    GROUP BY agent_name, scorer_name
    ORDER BY agent_name, scorer_name
  `;

  const summary = db.prepare(summaryQuery).all();

  if (summary.length === 0) {
    console.log('\n⚠️  No hay scores registrados aún.\n');
  } else {
    summary.forEach((row: any) => {
      console.log(`\n🤖 Agente: ${row.agent_name}`);
      console.log(`   📊 Scorer: ${row.scorer_name}`);
      console.log(`   📈 Evaluaciones: ${row.total_evaluations}`);
      console.log(`   ⭐ Score Promedio: ${row.avg_score}`);
      console.log(`   📉 Score Mínimo: ${row.min_score}`);
      console.log(`   📈 Score Máximo: ${row.max_score}`);
      console.log(`   🕐 Última evaluación: ${row.last_evaluation}`);
    });
  }

  // Ver últimos 10 scores en detalle
  console.log('\n' + '='.repeat(80));
  console.log('📋 ÚLTIMOS 10 SCORES DETALLADOS');
  console.log('='.repeat(80));

  const detailQuery = `
    SELECT 
      agent_name,
      scorer_name,
      score,
      reason,
      created_at,
      run_id
    FROM scores
    ORDER BY created_at DESC
    LIMIT 10
  `;

  const details = db.prepare(detailQuery).all();

  if (details.length === 0) {
    console.log('\n⚠️  No hay scores registrados aún.\n');
  } else {
    details.forEach((row: any, index: number) => {
      console.log(`\n${index + 1}. 🤖 ${row.agent_name} | 📊 ${row.scorer_name}`);
      console.log(`   ⭐ Score: ${row.score}`);
      console.log(`   💬 Razón: ${row.reason || 'N/A'}`);
      console.log(`   🕐 Fecha: ${row.created_at}`);
      console.log(`   🔗 Run ID: ${row.run_id?.substring(0, 8)}...`);
    });
  }

  // Ver scores por scorer
  console.log('\n' + '='.repeat(80));
  console.log('📊 ESTADÍSTICAS POR SCORER');
  console.log('='.repeat(80));

  const scorerQuery = `
    SELECT 
      scorer_name,
      COUNT(*) as total_runs,
      ROUND(AVG(score), 2) as avg_score,
      COUNT(DISTINCT agent_name) as agents_evaluated
    FROM scores
    GROUP BY scorer_name
    ORDER BY avg_score DESC
  `;

  const scorers = db.prepare(scorerQuery).all();

  if (scorers.length === 0) {
    console.log('\n⚠️  No hay scores registrados aún.\n');
  } else {
    scorers.forEach((row: any) => {
      console.log(`\n📊 ${row.scorer_name}`);
      console.log(`   🔢 Total ejecuciones: ${row.total_runs}`);
      console.log(`   ⭐ Score promedio: ${row.avg_score}`);
      console.log(`   🤖 Agentes evaluados: ${row.agents_evaluated}`);
    });
  }

  db.close();
  console.log('\n' + '='.repeat(80));
  console.log('✅ Consulta completada');
  console.log('='.repeat(80) + '\n');

} catch (error: any) {
  if (error.code === 'SQLITE_CANTOPEN') {
    console.error('\n❌ Error: No se pudo abrir la base de datos.');
    console.error('💡 Asegúrate de que el servidor haya corrido al menos una vez.');
    console.error(`📍 Buscando en: ${dbPath}\n`);
  } else {
    console.error('\n❌ Error:', error.message, '\n');
  }
  process.exit(1);
}

