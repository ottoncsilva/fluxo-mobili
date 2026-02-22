
# Fluxo Mobili ERP - Guia de Instalação Simplificado

Este guia contém tudo o que você precisa para rodar o aplicativo localmente.

## Como Rodar

**Pré-requisitos:** Node.js instalado.

1. **Instalar dependências:**
   Abra o terminal na pasta do projeto e rode:
   ```bash
   npm install
   ```

2. **Rodar o aplicativo:**
   Após a instalação, rode:
   ```bash
   npm run dev
   ```

3. **Rodar Testes (Opcional):**
   Para verificar se tudo está funcionando corretamente:
   ```bash
   npm test
   ```

## Configuração do Firebase
O aplicativo já está configurado para usar o Firebase se as variáveis de ambiente estiverem presentes no arquivo `.env`. Caso contrário, ele usará o armazenamento local (LocalStorage).
