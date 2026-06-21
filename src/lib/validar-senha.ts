// Validação de força mínima de senha — usado em qualquer tela onde o usuário define
// ou troca sua própria senha (redefinir-senha, perfil). Mantém a regra simples (não exige
// caracteres especiais obrigatórios) para não frustrar o usuário, mas bloqueia o básico:
// senha curta, sem números/letras, ou senhas extremamente comuns.

const SENHAS_COMUNS = [
  '12345678', '123456789', '1234567890', 'password', 'senha123', 'senha1234',
  'qwerty123', 'abc123456', '11111111', '00000000', 'admin123', 'a12345678',
  'iloveyou1', '123123123', '87654321',
]

/** Retorna uma mensagem de erro se a senha for fraca, ou null se estiver ok. */
export function validarSenha(senha: string): string | null {
  if (senha.length < 8) {
    return 'A senha deve ter pelo menos 8 caracteres.'
  }
  if (!/[a-zA-Z]/.test(senha)) {
    return 'A senha deve conter pelo menos uma letra.'
  }
  if (!/[0-9]/.test(senha)) {
    return 'A senha deve conter pelo menos um número.'
  }
  if (/^(.)\1+$/.test(senha)) {
    return 'A senha não pode ser um único caractere repetido.'
  }
  if (SENHAS_COMUNS.includes(senha.toLowerCase())) {
    return 'Essa senha é muito comum e fácil de adivinhar. Escolha outra.'
  }
  return null
}
