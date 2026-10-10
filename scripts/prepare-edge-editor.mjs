// Bundles sem segredos para o editor Supabase quando o CLI não está autenticado.
// Helpers locais concatenados; imports npm permanecem externos e versionados.
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import ts from 'typescript'
const helpers={
  'chat-interpret':['proposal'],
  'calendar-connect':['calendar-crypto'],
  'calendar-callback':['calendar-crypto'],
  'calendar-manage':['calendar-crypto','calendar-tokens','google-calendar','calendar-codec','calendar-exceptions','calendar-sync'],
}
await mkdir('.local/edge-editor',{recursive:true})
for(const [name,files] of Object.entries(helpers)){
  const paths=[...files.map(file=>`supabase/functions/_shared/${file}.ts`),`supabase/functions/${name}/index.ts`]
  const parts=[]
  const imports=new Set()
  for(const path of paths){
    let content=await readFile(path,'utf8')
    const source=ts.createSourceFile(path,content,ts.ScriptTarget.Latest,true)
    const ranges=source.statements.filter(node=>{
      if(!ts.isImportDeclaration(node))return false
      if(node.moduleSpecifier.text.startsWith('.'))return true
      const text=node.getText(source).replace(/;$/,'')
      if(imports.has(text))return true
      imports.add(text);return false
    }).map(node=>[node.getFullStart(),node.end]).reverse()
    for(const [from,to] of ranges)content=content.slice(0,from)+content.slice(to)
    content=content.replace("from '@js-temporal/polyfill'","from 'npm:@js-temporal/polyfill@0.5.1'")
    parts.push(`// Fonte: ${path}\n${content.trim()}`)
  }
  await writeFile(`.local/edge-editor/${name}.ts`,parts.join('\n\n')+'\n')
  console.log(`${name}: bundle preparado em .local/edge-editor (sem credenciais)`)
}
