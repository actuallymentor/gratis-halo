import { eslint_config } from 'airier'

export default [
    {
        ignores: [
            `.browser-profile/**`,
        ],
    },
    ...eslint_config.map( config => config.rules
        ? {
            ...config,
            rules: {
                ...config.rules,
                indent: `off`,
            },
        }
        : config ),
]
