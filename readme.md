只对以 es6 语法编写的程序源代码使用。

node 环境下使用。

目的： 从单个es6模块中抽出需要的部分，删除无关代码。

以简单的方式计算依赖，具体可以看源码 index.js 中对 ast 的解析过程。

和主流工具不同，这个程序不计算无关代码的副作用，这是故意为之的。

可能有 bug。

example：

```javascript
import a from ''
import others_import from ''

let b = 'b'
export let c = ['a', b, 'c']

function others_func(){
    a.push(1)
}
let others_var = '123'
```

=>

```javascript
let b = 'b'
let c = ['a', b, 'c']
export {c}
```