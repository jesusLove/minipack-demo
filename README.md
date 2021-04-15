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

直接查看源码: [src/minipack.js](src/minipack.js).

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

<hr/>

# 阅读笔记
## 一、创建资源 Asset 

每一个 module 都会生成一个 Asset 对象，对象中保存资源的 id，filename, 依赖关系，以及 babel 转码后的 code 。

实现如下：

```js
// 创建 Asset
// 接收文件名
function createAsset(filename) {
  // 1. 读取文件内容
  const content = fs.readFileSync(filename, 'utf-8');
  // 2. 生成 AST
  const ast = babylon.parse(content, {
    sourceType: 'module',
  });
  // 3. 获取依赖，读取 AST 中 ImportDeclaration
  const dependencies = [];
  traverse(ast, {
    ImportDeclaration: ({node}) => {
      dependencies.push(node.source.value);
    },
  });
  // 4. 唯一标识
  const id = ID++;
  // 5. 转义代码，适配不同版本浏览器
  const {code} = transformFromAst(ast, null, {
    presets: ['env'],
  });
  return {
    id,
    filename,
    dependencies,
    code,
  };
}
```
1. 通过 fs 读取绝对路径 filename 的内容。
2. 使用 babylon 工具将文件内容转为 AST。 AST 的结构可以查看 [AST Explorer](https://astexplorer.net/)。


```json
// import aa from 'xxx.js' 的 AST JSON 结构。

{
  "type": "Program",
  "start": 0,
  "end": 23,
  "body": [
    {
      "type": "ImportDeclaration",
      "start": 0,
      "end": 23,
      "specifiers": [
        {
          "type": "ImportDefaultSpecifier",
          "start": 7,
          "end": 9,
          "local": {
            "type": "Identifier",
            "start": 7,
            "end": 9,
            "name": "aa"
          }
        }
      ],
      "source": {
        "type": "Literal",
        "start": 15,
        "end": 23,
        "value": "xxx.js",  <------
        "raw": "'xxx.js'"
      }
    }
  ],
  "sourceType": "module"
}
```

3. 获取依赖，通过读取 AST 中的 ImportDeclaration 得到值。这里读取到的是文件中所有的依赖并存放在 `dependencies` 数组中。
4. Asset 的唯一标识，用来识别身份。
5. 使用 Babel 把 AST 转义成所有浏览器都可以支持的格式。
6. 返回 Asset 对象，包含 id, filename, dependencies, code。


## 二、生成依赖图谱

从主 mainAsset 开始，遍历所有 module 的依赖创建 childAsset 并将其推入队列中。

```js
// 创建依赖图谱
function createGraph(entry) {
  // 1. 入口元素生成 asset
  const mainAsset = createAsset(entry);
  // 2. 队列
  const queue = [mainAsset];
  // 3. 遍历队列
  for (const asset of queue) {
    // 3.1 保存子依赖和ID之间的映射，例如：{xxx.js : 1}
    asset.mapping = {};
    // 3.2 所在目录
    const dirname = path.dirname(asset.filename);
    // 3.3 处理依赖
    asset.dependencies.forEach(relativePath => {
      // 3.3.1 依赖绝对路径
      const absolutePath = path.join(dirname, relativePath);
      // 3.3.2 生成 childAsset
      const child = createAsset(absolutePath);
      
      asset.mapping[relativePath] = child.id;
      // 3.3.3 推入 queue 中。
      queue.push(child);
    });
  }
  // 4. 返回 queue 队列，保存的是所有的 Asset 对象。
  return queue;
}
```

1. 入口文件生成主 mainAsset 对象。
2. 创建队列并把 mainAsset 推入到 queue 中。
3. for...of 队列内容，根据 dependencies 数组创建依赖的 Asset 边推入到 queue 中。


## 三、处理依赖图谱，返回自调用函数

返回一个自调用函数，浏览器可以直接执行。 自调用函数如下结构：

```js
(function() {})()
```

下面看看具体的实现代码：

```js
// 打包函数，返回一个自调用函数
// (function(){})()
function bundle(graph) {
  // 1. 所有的依赖
  let modules = '';
  // 2. 创建映射关系
  /*
    id: [ 
         function(require, module, exports) { code },
        {xxxx.js: id}
        ],
  */
  graph.forEach(mod => {
    modules += `${mod.id}: [
      function(require, module, exports) {
        ${mod.code}
      },
      ${JSON.stringify(mod.mapping)}
    ]`;
  });
  // 创建自调用函数
  // 1. 接收 modules 对象作为参数。上面的 modules 字符串包转为 modules 对象。
  // 2. 创建 require 方法接收资源 ID 作为参数
  // 3. 根据 id 读取 modules 中对应的 fn  和 mapping
  const result = `
  (function(modules) {
    function require(id) {
      const [fn, mapping] = modules[id];
      function localRequire(name) {
        return require(mapping[name]);
      }
      const module = {exports: {}};
      fn(localRequire, module, module.exports)
      return module.exports
    }
    require(0)
  })({${modules}})
  `;
  return result;
}

```