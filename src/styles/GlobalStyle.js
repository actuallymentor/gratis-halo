import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
    :root {
        color-scheme: light;
        --accent: #7ec0d0;
        --accent-strong: #2f8092;
        --ink: #14313a;
        --muted: #60747b;
        --line: #d7e3e7;
        --surface: #ffffff;
        --surface-soft: #f1f6f7;
        --body: #fafbfc;
        --green: #287b55;
        --green-bg: #e7f4ee;
        --amber: #8a6420;
        --amber-bg: #fff4d9;
        --orange: #9a4d22;
        --orange-bg: #ffe8da;
        --red: #9f2f38;
        --red-bg: #ffe7ea;
        --space-xs: 0.25rem;
        --space-s: 0.5rem;
        --space-m: 1rem;
        --space-l: 1.5rem;
        --space-xl: 2rem;
        --space-2xl: 3rem;
        --radius: 8px;
        font-size: 100%;
    }

    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        min-width: 320px;
        min-height: 100dvh;
        color: var(--ink);
        background: var(--body);
        font-family: "Nunito", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
        font-size: 1rem;
        line-height: 1.5;
        letter-spacing: 0;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
    }

    h1,
    h2,
    h3,
    h4 {
        margin: 0;
        font-family: "Montserrat", system-ui, -apple-system, "Segoe UI", sans-serif;
        font-weight: 600;
        line-height: 1.15;
        letter-spacing: 0;
    }

    p {
        margin: 0;
    }

    a {
        color: var(--accent-strong);
        text-decoration-thickness: 2px;
        text-underline-offset: 0.18em;
    }

    button,
    input {
        font: inherit;
        letter-spacing: 0;
    }

    button {
        cursor: pointer;
    }

    button:disabled {
        cursor: not-allowed;
    }

    #root {
        min-height: 100dvh;
    }

    ::selection {
        color: #071b21;
        background: #b9e5ee;
    }
`
