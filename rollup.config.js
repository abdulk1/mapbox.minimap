import typescript from '@rollup/plugin-typescript';
import buble from '@rollup/plugin-buble';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'esm'
    },
    plugins: [
      typescript(),
      buble(),
      resolve(),
      terser(),
      copy({
        targets: [
          { src: 'src/styles.css', dest: 'dist' },
          { src: 'src/images/*', dest: 'dist/images' }
        ]
      })
    ]
  }
];
