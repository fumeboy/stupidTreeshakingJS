const treeshaking = require('./index')

const code_1 = `
import a from ''
import others_import from ''

let b = 'b'
export let c = ['a', b, 'c']

function others_func(){
    a.push(1)
}
let others_var = '123'
`;

console.log(treeshaking(['c'],code_1))

