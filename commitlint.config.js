module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nova funcionalidade
        'fix',      // Correção de bug
        'docs',     // Documentação
        'style',    // Formatação, ponto e vírgula, etc
        'refactor', // Refatoração de código
        'test',     // Adição ou correção de testes
        'chore',    // Tarefas de build, configuração, etc
        'perf',     // Melhoria de performance
        'ci',       // Mudanças na CI
        'build',    // Mudanças no sistema de build
        'revert'    // Reverter commit anterior
      ]
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 100]
  }
};
