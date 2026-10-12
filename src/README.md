# Snapshots dos requisitos

Cada pasta desta área contém uma cópia completa dos arquivos rastreados do projeto no commit indicado. Os snapshots são históricos e não participam do build da aplicação.

| Pasta | Commit de origem | Observação |
|---|---|---|
| `RF-001 Login` | `0ff4e1a` | Login e cadastro foram registrados juntos neste commit. |
| `RF-002 Cadastro` | `0ff4e1a` | Mesmo estado de `RF-001`, pois os dois requisitos aparecem no mesmo commit. |
| `RF-003 Downloads` | `025fb29` | Marco identificado como “Download funcionando”. |
| `RF-004 Pagamentos` | `b682b74` | Estado atual do projeto no commit da correção da rota do webhook Stripe. |

## Padrão para requisitos futuros

Após a implementação, a aprovação e o commit de um requisito, criar uma pasta `RF-NNN Nome` com os arquivos rastreados do projeto naquele commit. Registrar aqui o identificador do requisito, o commit de origem e observações relevantes. Não incluir `.env`, dependências (`node_modules`), artefatos de build (`dist`) nem snapshots anteriores dentro do novo snapshot.

O projeto usa um build por lista explícita de diretórios e arquivos. A pasta `src/` é destinada somente a estes snapshots e não deve ser usada como origem da aplicação publicada.
