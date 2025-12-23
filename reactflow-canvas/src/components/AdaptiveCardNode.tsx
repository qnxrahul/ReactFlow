import { memo, useCallback, useMemo, type ReactElement } from 'react'
import { Handle, Position, type Edge, type Node, type NodeProps, useReactFlow, useUpdateNodeInternals } from '@xyflow/react'

export type AdaptiveCardNodeData = {
  kind: 'adaptive-card' | 'agent'
  title: string
  subtitle?: string
  description?: string
  fieldCount?: number
  fieldSummary?: Array<{ type?: string; label?: string; name?: string }>
  toolCount?: number
  dependsOn?: string[]
  form?: {
    values?: Record<string, unknown>
    activeTabs?: Record<string, string>
    lastAction?: { name?: string; at: string }
  }
  raw?: unknown
}

function chipText(field: { type?: string; label?: string; name?: string }) {
  const label = field.label || field.name || ''
  const type = field.type || ''
  const core = label ? `${label}` : type ? `${type}` : 'field'
  return core.length > 26 ? `${core.slice(0, 23)}…` : core
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asBool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function getFieldKey(field: Record<string, unknown>): string {
  return (
    asString(field.editscope) ||
    asString(field.scope) ||
    asString(field.name) ||
    asString(field.id) ||
    `field_${Math.random().toString(36).slice(2)}`
  )
}

type SelectOption = { id: string; name: string }

function normalizeOptions(options: unknown): SelectOption[] {
  if (!Array.isArray(options)) return []
  return options
    .map((opt) => {
      if (!isRecord(opt)) return null
      const id = asString(opt.Id) ?? asString(opt.id) ?? asString(opt.value) ?? asString(opt.Name) ?? asString(opt.name)
      const name = asString(opt.Name) ?? asString(opt.name) ?? id
      if (!id || !name) return null
      return { id, name }
    })
    .filter((x): x is SelectOption => Boolean(x))
}

function getLayout(raw: unknown): unknown {
  if (!isRecord(raw)) return null
  return raw.layout ?? raw.AdaptiveCardlayout ?? null
}

export const AdaptiveCardNode = memo(({ id, data }: NodeProps<Node<AdaptiveCardNodeData>>) => {
  const isAgent = data.kind === 'agent'
  const fields = data.fieldSummary ?? []
  const dependsOn = data.dependsOn ?? []
  const updateInternals = useUpdateNodeInternals()
  const { setNodes } = useReactFlow<Node<AdaptiveCardNodeData>, Edge>()

  const patch = useCallback(
    (delta: Partial<AdaptiveCardNodeData>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? ({ ...n, data: { ...(n.data as AdaptiveCardNodeData), ...delta } }) : n)))
      // allow handles to reposition if size changes (e.g., accordion expand)
      setTimeout(() => updateInternals(id), 0)
    },
    [id, setNodes, updateInternals],
  )

  const formValues = data.form?.values ?? {}
  const activeTabs = data.form?.activeTabs ?? {}

  const setValue = useCallback(
    (key: string, value: unknown) => {
      patch({
        form: {
          ...(data.form ?? {}),
          values: { ...(data.form?.values ?? {}), [key]: value },
        },
      })
    },
    [data.form, patch],
  )

  const setActiveTab = useCallback(
    (tabKey: string, tabId: string) => {
      patch({
        form: {
          ...(data.form ?? {}),
          activeTabs: { ...(data.form?.activeTabs ?? {}), [tabKey]: tabId },
        },
      })
    },
    [data.form, patch],
  )

  const recordAction = useCallback(
    (name?: string) => {
      patch({
        form: {
          ...(data.form ?? {}),
          lastAction: { name, at: new Date().toISOString() },
        },
      })
    },
    [data.form, patch],
  )

  const layout = useMemo(() => (isAgent ? null : getLayout(data.raw)), [data.raw, isAgent])

  const renderField = useCallback(
    (field: Record<string, unknown>, pathKey: string) => {
      const type = asString(field.type) ?? 'unknown'
      const label = asString(field.label) ?? asString(field.labelname) ?? asString(field.displaydata)
      const placeholder = asString(field.placeholder)
      const required = asBool(field.required) ?? false
      const maxLength = asNumber(field.maxlength)
      const name = asString(field.name)
      const key = `${pathKey}:${getFieldKey(field)}`
      const value = formValues[key]

      const wrap = (content: ReactElement) => (
        <div className="ac-form__row" key={key}>
          {label && <div className="ac-form__label">{label}{required ? <span className="ac-form__req">*</span> : null}</div>}
          {content}
        </div>
      )

      if (type === 'label-building-block') {
        return (
          <div className="ac-form__row" key={key}>
            <div className="ac-form__label">{label ?? name ?? 'Label'}</div>
            {asString(field.displaydata) && <div className="ac-form__text">{String(field.displaydata)}</div>}
          </div>
        )
      }

      if (type === 'text-building-block') {
        return wrap(
          <input
            className="ac-form__input"
            value={typeof value === 'string' ? value : ''}
            placeholder={placeholder ?? ''}
            required={required}
            maxLength={maxLength}
            onChange={(e) => setValue(key, e.target.value)}
          />,
        )
      }

      if (type === 'number-building-block') {
        return wrap(
          <input
            className="ac-form__input"
            type="number"
            value={typeof value === 'number' ? value : value === '' ? '' : Number(value ?? '')}
            placeholder={placeholder ?? ''}
            required={required}
            onChange={(e) => setValue(key, e.target.value === '' ? '' : Number(e.target.value))}
          />,
        )
      }

      if (type === 'dropdown-building-block') {
        const options = normalizeOptions(field.Options ?? field.options)
        return wrap(
          <select
            className="ac-form__select"
            value={typeof value === 'string' ? value : ''}
            required={required}
            onChange={(e) => setValue(key, e.target.value)}
          >
            <option value="">{placeholder ?? 'Select…'}</option>
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>,
        )
      }

      if (type === 'radio-button-building-block') {
        const options = normalizeOptions(field.Options ?? field.options)
        const current = typeof value === 'string' ? value : ''
        return wrap(
          <div className="ac-form__radioGroup">
            {options.map((opt) => (
              <label key={opt.id} className="ac-form__radio">
                <input
                  type="radio"
                  name={key}
                  checked={current === opt.id}
                  onChange={() => setValue(key, opt.id)}
                />
                <span>{opt.name}</span>
              </label>
            ))}
          </div>,
        )
      }

      if (type === 'multi-select') {
        const options = normalizeOptions(field.Options ?? field.options)
        const current = Array.isArray(value) ? value.filter((v) => typeof v === 'string') : []
        return wrap(
          <div className="ac-form__checkboxGrid">
            {options.map((opt) => {
              const checked = current.includes(opt.id)
              return (
                <label key={opt.id} className="ac-form__check">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked ? Array.from(new Set([...current, opt.id])) : current.filter((x) => x !== opt.id)
                      setValue(key, next)
                    }}
                  />
                  <span>{opt.name}</span>
                </label>
              )
            })}
          </div>,
        )
      }

      if (type === 'file-upload-building-block') {
        const multiple = asBool(field.ismultiupload) ?? true
        return wrap(
          <input
            className="ac-form__input"
            type="file"
            multiple={multiple}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: f.size, type: f.type }))
              setValue(key, files)
            }}
          />,
        )
      }

      if (type === 'table-grid-building-block') {
        const cols = Array.isArray(field.fields) ? field.fields.filter(isRecord) : []
        return (
          <div className="ac-form__row" key={key}>
            {label && <div className="ac-form__label">{label}{required ? <span className="ac-form__req">*</span> : null}</div>}
            <div className="ac-form__table">
              <div className="ac-form__tableHeader">
                {cols.length === 0 ? (
                  <span className="ac-form__muted">No column schema provided.</span>
                ) : (
                  cols.map((c, idx) => (
                    <span key={`${asString(c.name) ?? 'col'}-${idx}`} className="ac-form__th">
                      {asString(c.label) ?? asString(c.name) ?? `Col ${idx + 1}`}
                    </span>
                  ))
                )}
              </div>
              <div className="ac-form__muted">Data-backed grids aren’t wired up yet (this is UI-only rendering).</div>
            </div>
          </div>
        )
      }

      if (type === 'accordion-building-block') {
        const nested = Array.isArray(field.fields) ? field.fields.filter(isRecord) : []
        const openByDefault = asBool(field.isOpenByDefault) ?? true
        return (
          <details className="ac-form__accordion" key={key} open={openByDefault}>
            <summary className="ac-form__accordionSummary">{label ?? name ?? 'Section'}</summary>
            <div className="ac-form__accordionBody">
              {nested.map((nf, idx) => renderField(nf, `${key}:${idx}`))}
            </div>
          </details>
        )
      }

      if (type === 'tab-building-block') {
        const options = normalizeOptions(field.options)
        const fieldsets = Array.isArray(field.fieldset) ? field.fieldset.filter(isRecord) : []
        const tabKey = key
        const defaultTab = asString(field.defaulttabid) ?? (options[0]?.id ?? '1')
        const active = activeTabs[tabKey] ?? defaultTab
        const selectedFieldset = fieldsets.find((fs) => String(fs.id ?? '') === active) ?? fieldsets[0]
        const nested = selectedFieldset && Array.isArray(selectedFieldset.fields) ? (selectedFieldset.fields as unknown[]).filter(isRecord) : []
        return (
          <div className="ac-form__row" key={key}>
            {label && <div className="ac-form__label">{label}</div>}
            <div className="ac-form__tabs">
              <div className="ac-form__tabBar">
                {options.map((opt) => (
                  <button
                    type="button"
                    key={opt.id}
                    className={active === opt.id ? 'ac-form__tab ac-form__tab--active' : 'ac-form__tab'}
                    onClick={() => setActiveTab(tabKey, opt.id)}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
              <div className="ac-form__tabPanel">
                {nested.length === 0 ? (
                  <div className="ac-form__muted">No fields for this tab.</div>
                ) : (
                  nested.map((nf, idx) => renderField(nf, `${key}:${active}:${idx}`))
                )}
              </div>
            </div>
          </div>
        )
      }

      const isButton =
        type === 'submit-button-builing-block' ||
        type === 'button-building-block' ||
        type === 'submit-button-building-block'
      if (isButton) {
        const buttonLabel = asString(field.label) ?? asString(field.name) ?? 'Action'
        return (
          <div className="ac-form__row" key={key}>
            <button type="button" className="ac-form__button" onClick={() => recordAction(buttonLabel)}>
              {buttonLabel}
            </button>
          </div>
        )
      }

      // Unsupported/unknown
      return (
        <div className="ac-form__row" key={key}>
          <div className="ac-form__label">{label ?? name ?? 'Field'}</div>
          <div className="ac-form__muted">
            Unsupported field type: <code>{type}</code>
          </div>
        </div>
      )
    },
    [activeTabs, formValues, recordAction, setActiveTab, setValue],
  )

  const renderLayout = useCallback(
    (layoutNode: unknown, pathKey: string): ReactElement | null => {
      if (!layoutNode || typeof layoutNode !== 'object') return null
      const obj = layoutNode as Record<string, unknown>
      const localFields = Array.isArray(obj.fields) ? (obj.fields as unknown[]).filter(isRecord) : []
      const children = Array.isArray(obj.child) ? (obj.child as unknown[]) : []

      return (
        <div className="ac-form__section" key={pathKey}>
          {localFields.length > 0 && (
            <div className="ac-form__fields">
              {localFields.map((f, idx) => renderField(f, `${pathKey}:f:${idx}`))}
            </div>
          )}
          {children.length > 0 && (
            <div className="ac-form__children">
              {children.map((c, idx) => {
                if (isRecord(c) && c.AdaptiveCardlayout) {
                  return renderLayout(c.AdaptiveCardlayout, `${pathKey}:c:${idx}:acl`) ?? <div key={`${pathKey}:c:${idx}`} />
                }
                return renderLayout(c, `${pathKey}:c:${idx}`) ?? <div key={`${pathKey}:c:${idx}`} />
              })}
            </div>
          )}
        </div>
      )
    },
    [renderField],
  )

  return (
    <div className={`ac-node ${isAgent ? 'ac-node--agent' : 'ac-node--card'}`}>
      <div className="ac-node__header">
        <div className="ac-node__title">{data.title}</div>
        <div className="ac-node__meta">
          <span className="ac-node__badge">{isAgent ? 'Agent' : 'Adaptive Card'}</span>
          {typeof data.fieldCount === 'number' && !isAgent && <span className="ac-node__pill">{data.fieldCount} fields</span>}
          {typeof data.toolCount === 'number' && isAgent && <span className="ac-node__pill">{data.toolCount} tools</span>}
        </div>
        {data.subtitle && <div className="ac-node__subtitle">{data.subtitle}</div>}
      </div>

      {data.description && <div className="ac-node__desc">{data.description}</div>}

      {!isAgent && fields.length > 0 && (
        <div className="ac-node__chips">
          {fields.map((f, idx) => (
            <span key={`${f.type ?? 't'}-${f.name ?? 'n'}-${idx}`} className="ac-node__chip" title={`${f.type ?? ''} ${f.name ?? ''}`}>
              {chipText(f)}
            </span>
          ))}
        </div>
      )}

      {!isAgent && layout != null ? (
        <div className="ac-form">
          {renderLayout(layout, `layout:${id}`)}
          {data.form?.lastAction?.at && (
            <div className="ac-form__muted ac-form__lastAction">
              Last action: <strong>{data.form?.lastAction?.name ?? 'unknown'}</strong> at {data.form.lastAction.at}
            </div>
          )}
        </div>
      ) : null}

      {isAgent && dependsOn.length > 0 && (
        <div className="ac-node__depends">
          <span className="ac-node__dependsLabel">Depends on:</span>
          <span className="ac-node__dependsValue">{dependsOn.join(', ')}</span>
        </div>
      )}

      <details className="ac-node__raw">
        <summary>View JSON</summary>
        <pre>{JSON.stringify(data.raw, null, 2)}</pre>
      </details>

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
})

