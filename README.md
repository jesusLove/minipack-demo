## 📦 Minipack

> A simplified example of a modern module bundler written in JavaScript
> 
> 一个用 JS 编写的现代模块打包器的简化示例

[项目地址](https://github.com/ronami/minipack)

### 简介

作为前端开发者，工作中会花费大量的时间在 Webpack、Browserify 和 Parcel 工具上。

理解这些工具是如何工作的可以帮助我们更好的编写代码。通过理解我们的代码是如何变为 Bundle 以及 Bunlde 的样子，有助于更好的调试代码。

这个项目的目的是解释大多数打包程序是如何在内部工作的。它包含了一个简化的但仍然相当准确的捆绑程序的简短实现。伴随着代码，还有注释解释代码试图实现什么。

### 听起来很酷，那我们从哪里开始呢？

直接重看源码: [src/minipack.js](src/minipack.js).

### 尝试运行源码

首先安装依赖：

```sh
$ npm install
```
然后运行

```sh
$ node src/minipack.js
```

### 额外链接

- [AST Explorer](https://astexplorer.net) : 可以查看 JS 解析成 AST 时数据结构
- [Babel REPL](https://babeljs.io/repl)
- [Babylon](https://github.com/babel/babel/tree/master/packages/babel-parser) ：生成 AST
- [Babel Plugin Handbook](https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md)
- [Webpack: Modules](https://webpack.js.org/concepts/modules)
