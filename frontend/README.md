# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```

## Useful links
* <https://docs.chain.link/resources/acquire-link>
* <https://docs.chain.link/vrf>
* <https://docs.chain.link/vrf/v2-5/overview/direct-funding>
* <https://docs.chain.link/vrf/v2-5/direct-funding/get-a-random-number>
* <https://faucets.chain.link/sepolia>
* <https://cloud.google.com/application/web3/faucet/ethereum/sepolia>
* <https://sepolia-faucet.pk910.de/>
* <https://docs.chain.link/resources/fund-your-contract>
* <https://docs.chain.link/vrf/v2-5/supported-networks>

* <https://docs.chain.link/vrf/v2-5/getting-started>
* <https://docs.chain.link/vrf/v2-5/subscription/create-manage>
