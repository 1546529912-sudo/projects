# Pencil Batch Design Rules

Safe rules for using Pencil `batch_design`.

## 1. Binding names vs persistent node IDs

`batch_design` operations can use local binding names inside one block.

Example:

```text
hero=I(document,{type:"frame",name:"Hero",x:0,y:0,width:1440,height:900,fill:"#0A0A0A"})
title=I(hero,{type:"text",name:"Hero / Title",text:"Hello",x:64,y:64,width:600,height:80})
```

`hero` and `title` are local binding names. They only exist inside the current batch block unless explicitly returned/available.

Do not confuse local binding names with existing persistent node IDs.

## 2. Do not prefix unknown existing node IDs with `#`

A value like:

```text
#RNiKh
```

may be interpreted as a reference to a local binding variable named `RNiKh`. If no such binding exists, the operation fails.

Before updating an existing node:

1. Read it with inspection tools.
2. Use exact node reference format required by active tool schema.
3. Do not invent `#` prefixes.
4. If unclear, run a tiny safe test on duplicate or inspect examples/tool schema.

## 3. Always bind created nodes

Every insert/copy/replace operation that will be referenced later in the same batch must be assigned a binding name.

Good:

```text
card=I(parent,{type:"frame",name:"ProductCard",x:0,y:0,width:320,height:420,fill:"#FFFFFF"})
price=I(card,{type:"text",name:"ProductCard / Price",text:"$29",x:24,y:320,width:120,height:32})
```

Risky:

```text
I(parent,{type:"frame",name:"ProductCard",x:0,y:0,width:320,height:420,fill:"#FFFFFF"})
price=I(#ProductCard,{type:"text",name:"Price",text:"$29"})
```

## 4. Prefer section-sized batches

Use logical blocks:

- Create page/frame and sections.
- Create content inside sections.
- Update styling.
- Create variants/states.

Avoid huge batches where one bad reference rolls back everything.

Recommended:

- 5–15 operations for high-risk changes.
- Up to 25 operations only when references are simple and verified.

## 5. Read after high-risk batches

After a batch creates containers/components:

1. Inspect hierarchy.
2. Confirm returned IDs/bindings.
3. Use confirmed references for next batch.

Do not build on assumed IDs.

## 6. Update existing nodes safely

1. Inspect node.
2. Store exact returned reference.
3. Use update operation with exact syntax.
4. If update fails with `binding variable ... not found`, remove invented binding prefixes and re-check reference.
5. Retry smallest possible batch.

## 7. Variables and fills

Raw fill values are usually safe if schema accepts:

```text
{"fill":"#F5F4F2"}
```

If using design variables/tokens, call variable inspection first and confirm variable exists.

Do not bind fill to a variable ID unless returned by variable read or created successfully.

## 8. Atomic rollback

Treat `batch_design` as atomic.

- Do not mix unrelated changes.
- Do not include unverified references in large batches.
- On failure, fix operation list and rerun corrected block.
- Never report partial success unless tool confirms it.

## 9. Recovery for `binding variable ... not found`

1. Find operation containing `#...` or unbound reference.
2. Decide whether it should be local binding or existing node.
3. If local, create/bind it earlier in same batch.
4. If existing node, re-read node and use correct reference format.
5. Rerun small corrected batch.
6. Verify with screenshot/hierarchy inspection.

## 10. Hard rule

Do not generate update operations targeting unverified references like:

```text
U("#someId", {...})
```

unless the active Pencil MCP schema explicitly documents that exact syntax and the referenced binding exists.
