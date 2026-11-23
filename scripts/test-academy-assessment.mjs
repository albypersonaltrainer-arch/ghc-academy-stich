import assert from 'node:assert/strict'
import test from 'node:test'
import { scoreSingleChoice, GHC_PASS_PERCENT } from '../lib/academy/assessment-policy.ts'

const questions = (n) => Array.from({ length: n }, () => ({ choices: ['A', 'B'], answer: 0 }))
const answers = (correct, total) => Object.fromEntries(
  Array.from({ length: total }, (_, i) => [i, i < correct ? 0 : 1])
)

test('regla GHC: umbral 80 % exacto', () => {
  assert.equal(GHC_PASS_PERCENT, 80)
  assert.deepEqual(scoreSingleChoice(questions(5), answers(4, 5)), {
    correct: 4, total: 5, percentage: 80, completed: true, passed: true
  })
  assert.equal(scoreSingleChoice(questions(10), answers(7, 10)).passed, false)
})

test('3 preguntas: 2/3 suspende y 3/3 supera', () => {
  assert.equal(scoreSingleChoice(questions(3), answers(2, 3)).passed, false)
  assert.equal(scoreSingleChoice(questions(3), answers(3, 3)).passed, true)
})

test('79,5 % no aprueba ni se muestra como 80 %', () => {
  const result = scoreSingleChoice(questions(200), answers(159, 200))
  assert.equal(result.percentage, 79.5)
  assert.equal(result.passed, false)
})

test('respuestas incompletas, inválidas o sin preguntas nunca aprueban', () => {
  const missing = scoreSingleChoice(questions(5), answers(4, 4))
  assert.equal(missing.completed, false)
  assert.equal(missing.passed, false)
  const invalid = scoreSingleChoice(questions(2), { 0: 0, 1: 99 })
  assert.equal(invalid.completed, false)
  assert.equal(invalid.passed, false)
  const empty = scoreSingleChoice([], {})
  assert.equal(empty.passed, false)
  assert.equal(empty.percentage, 0)
})
