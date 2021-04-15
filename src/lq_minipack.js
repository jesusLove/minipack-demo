const fs = require('fs');
const path = require('path');
const babylon = require('babylon');
const traverse = require('babel-traverse').default;
const {transformFromAst} = require('babel-core');

let ID = 0;

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
  const id = ID++;
  // 4. 转义代码，适配不同版本浏览器
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
// 创建依赖图谱
function createGraph(entry) {
  // 1. 入口元素生成 asset
  const mainAsset = createAsset(entry);
  // 2. 队列
  const queue = [mainAsset];
  // 3. 遍历队列
  for (const asset of queue) {
    // 3.1 保存子依赖和ID之间的映射
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
      queue.push(child);
    });
  }
  return queue;
}
// 打包函数，返回一个自调用函数
// (function(){})()
function bundle(graph) {
  // 自执行函数的参数
  // key : value 映射 key 为模块 id，value 是一个 function 和依赖 mapping。
  let modules = '';
  graph.forEach(mod => {
    modules += `${mod.id}: [
      function(require, module, exports) {
        ${mod.code}
      },
      ${JSON.stringify(mod.mapping)}
    ]`;
  });
  // 创建一个 自调用方法，接收 modules 对象
  // 1. 内部创建 require 方法接收 id 作为参数
  // 2. 结构 modules 对应 id 的 fn 和 mapping
  // 3. localRequire 以对应路径文件的 id为参数获取module 内容。
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

const graph = createGraph('./example/entry.js');
const result = bundle(graph);
console.log(result);
