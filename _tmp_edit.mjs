import { readFileSync, writeFileSync } from 'fs'

const path = 'src/components/layout/SettingsDrawer.tsx'
let s = readFileSync(path, 'utf8')

// Wrap the save button with a flex row and add a Cancelar button.
const oldBtn = `      <Button
        type="button"
        size="sm"
        className="mt-3 w-full"
        loading={guardando}
        disabled={!puedeGuardar}
        onClick={manejarGuardar}
      >`
const newBtn = `      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="flex-1"
          onClick={onCancelar}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          loading={guardando}
          disabled={!puedeGuardar}
          onClick={manejarGuardar}
        >`

const candidates = [oldBtn, oldBtn.replace(/\r\n/g, '\n'), oldBtn.replace(/\n/g, '\r\n')]
const hit = candidates.find((c) => s.includes(c))
if (!hit) throw new Error('button block not found')
s = s.replace(hit, hit.includes('\r\n') ? newBtn : newBtn.replace(/\r\n/g, '\n'))

// Indent closing tags of the button block by one level.
const closeOld = `      </Button>
    </div>
  );
}`
const closeNew = `        </Button>
      </div>
    </div>
  );
}`
const closeCandidates = [closeOld, closeOld.replace(/\r\n/g, '\n')]
const closeHit = closeCandidates.find((c) => s.includes(c))
if (closeHit) {
  s = s.replace(closeHit, closeHit.includes('\r\n') ? closeNew : closeNew.replace(/\r\n/g, '\n'))
}

writeFileSync(path, s, 'utf8')
console.log('done')
