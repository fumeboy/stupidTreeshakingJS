const babylon = require("babylon");
const traverse = require("babel-traverse").default;
const generate = require("babel-generator").default;
const path = require("path");

module.exports = function(requires, src) {
  let vars = {}, // 记录标识符和它的一些信息
      expo = requires,
      pointStack = [],
      ast = babylon.parse(src, { sourceType: "module" });

  traverse(ast, {
    //遍历 ast 所有节点
    ImportDeclaration: path => {
      // type 1
      let p = path.node.source.value;
      for (let x in path.node.specifiers) {
        let s = path.node.specifiers[x];
        let type = s.type;
        if (type === "ImportSpecifier") {
          vars[s.local.name] = {
            iname: s.imported.name,
            path: p,
            ifuse: false,
            type: 1
          };
        } else if (type === "ImportDefaultSpecifier") {
          vars[s.local.name] = { path: p, ifuse: false, type: 1 };
        }
      }
    },
    AssignmentExpression: path => {
      // type 2
      pointStack.push({
        end: path.node.end,
        ptr: (vars[path.node.left.name] = {
          ifuse: false,
          type: 2,
          code: generate(path.node.right, {}).code,
          dependencies: []
        })
      });
    },
    VariableDeclarator: path => {
      // type 2
      pointStack.push({
        end: path.node.end,
        ptr: (vars[path.node.id.name] = {
          ifuse: false,
          type: 2,
          code: path.node.init ? generate(path.node.init, {}).code : "null",
          dependencies: []
        })
      });
    },
    FunctionDeclaration: path => {
      // type 3
      pointStack.push({
        end: path.node.end,
        ptr: (vars[path.node.id.name] = {
          ifuse: false,
          type: 3,
          code: generate(path.node, {}).code,
          dependencies: []
        })
      });
    },
    Identifier: path => {
      let len = pointStack.length
      if (len) {
        let p = pointStack[len - 1];
        if (path.node.end > p.end) {
          pointStack.pop();
          len--
        }
        for(let i = 0; i<len;i++){
          p = pointStack[i]
          if (path.node.end < p.end) {
            p.ptr.dependencies.push(path.node.name);
          }
        }
      }
    }
  });
  let used = expo.concat(),
      used_ = {}; // 记录哪些标识符是被使用的 (ifuse)
  for (let x in expo) {
    used_[expo[x]] = true;
  }
  for (let i = 0; i < used.length; i++) {
    //used 长度会变动，因此需要每次循环均检查长度
    var name = used[i];
    if (vars[name]) {
      console.log(1, name, vars[name])
      vars[name].ifuse = true;
      used_[name] = true;
      if (vars[name].type !== 1) {
        for (let x of vars[name].dependencies) {
          if (!used_[x]) {
            // 查重
            used.push(x);
          }
        }
      }
    }
  }
  let ret_1 = "";
  let ret_2 = "";
  let ret_3 = `export {${expo.join()}}`;
  let imports = {};
  let imports2 = {};
  for (let x in used_) {
    let v = vars[x];
    if (v.type === 1) {
      if (v.iname) {
        let n = v.iname === x ? x : v.iname + " as " + x;
        if (imports2[v.path]) {
          imports2[v.path].push(n);
        }else{
          imports2[v.path] = [n]
        }
      } else {
        imports[x] = v.path;
      }
    } else if (v.type === 2) {
      ret_2 += `let ${x} = ${v.code};`;
    } else if (v.type === 3) {
      ret_2 += v.code;
    }
  }
  for (let x in imports) {
    ret_1 += `import ${x} from '${imports[x]}';`;
  }
  for (let x in imports2) {
    ret_1 += `import {${imports2[x].join()}} from '${x}';`;
  }
  return ret_1 + ret_2 + ret_3;
};
