const path = require('path');

module.exports = {
    mode: 'development',
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'bundle.js',
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: ['babel-loader'],
            },
            // {
            //     test: /\.module\.css$/,
            //     use: [
            //         'style-loader',
            //         {
            //             loader: 'css-loader',
            //             options: {
            //                 modules: true,
            //             },
            //         },
            //     ],
            // },
            // {
            //     test: /\.css$/,
            //     use: ['style-loader', 'css-loader'],
            // },

            // CSS rules
            {
                test: /\.css$/,
                use: [
                    "style-loader",
                    {
                        loader: "css-loader",
                        options: {
                            importLoaders: 1,
                            modules: true,
                        },
                    },
                ],
            },
        ],
    },
    devServer: {
        proxy: {
            '/api': 'http://localhost:3000',
        },
    },
};