#!/usr/bin/env node
/**
 * Ayuda para traducir: lista los textos que parecen español y no pasan por `t`, `tn`, `tc`, `tx` ni `msg`.
 *
 *   node scripts/i18n-missing.mjs src/features/issues        (una carpeta o un archivo; por defecto, src)
 *
 * Es una heurística, no una garantía: marca el texto entre etiquetas de JSX y las cadenas con una palabra que empieza
 * en mayúscula o con tildes, «ñ», «¿», «¡» o comillas angulares. Un texto en minúsculas y sin tildes («sin fecha»)
 * no lo ve: igual hay que leer el archivo. Tampoco distingue lo que no se traduce (nombres propios, datos de ejemplo).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const target = process.argv[2] ?? 'src'
const SKIP = /(\.test\.[jt]sx?$)|([\\/]i18n[\\/])|([\\/]test[\\/])/

function files(path) {
  if (statSync(path).isFile()) return [path]
  return readdirSync(path).flatMap((name) => files(join(path, name)))
}

/** Quita comentarios conservando los saltos de línea (para que los números de línea sigan valiendo). */
function stripComments(code) {
  const blank = (text) => text.replace(/[^\n]/g, ' ')
  return code
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (match, before) => before + blank(match.slice(before.length)))
}

const SPANISH = /[áéíóúñÁÉÍÓÚÑ¿¡«»]|(?:^|[\s(>])[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}/
const WRAPPED = /(?<![\w.$])(?:t|tx|msg|tc|tn)\(\s*(?:[^,()'"`]+,\s*)?(?:(?:'[^']*'|"[^"]*"|`[^`]*`)\s*,\s*)?$/
const NOT_TEXT = /^(?:[A-Z][A-Za-z]+(?:\.[A-Za-z]+)*|[A-Z_]+|@?[\w./-]+|#[0-9a-fA-F]{3,8})$/

let total = 0
for (const file of files(target)) {
  if (!/\.(jsx?|mjs)$/.test(file) || SKIP.test(file)) continue
  const code = stripComments(readFileSync(file, 'utf8'))
  const hits = []
  const lineOf = (index) => code.slice(0, index).split('\n').length
  // Texto entre etiquetas de JSX
  for (const match of code.matchAll(/>([^<>{}=;]*[A-Za-zÁÉÍÓÚáéíóúñÑ]{2,}[^<>{}=;]*)</g)) {
    const text = match[1].trim().replace(/\s+/g, ' ')
    if (text && SPANISH.test(text) && !/^[\w.]+\)?$/.test(text)) hits.push([lineOf(match.index), text])
  }
  // Cadenas literales
  for (const match of code.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) {
    const text = (match[1] ?? match[2] ?? match[3] ?? '').trim()
    if (text.length < 2 || !SPANISH.test(text) || NOT_TEXT.test(text)) continue
    const before = code.slice(Math.max(0, match.index - 160), match.index)
    if (WRAPPED.test(before)) continue
    if (/(?:from|import)\s*$/.test(before) || /(?:className|class|d|viewBox|key|to|href|path)=\{?\s*$/.test(before)) continue
    hits.push([lineOf(match.index), text.replace(/\s+/g, ' ').slice(0, 110)])
  }
  if (hits.length === 0) continue
  total += hits.length
  console.log(`\n${file}`)
  for (const [line, text] of hits.sort((a, b) => a[0] - b[0])) console.log(`  ${String(line).padStart(4)}  ${text}`)
}
console.log(total === 0 ? 'Nada pendiente a la vista.' : `\n${total} textos por revisar.`)
