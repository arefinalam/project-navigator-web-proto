import { useMemo, useState } from 'react'

type AutocompleteProps = {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder?: string
}

export function Autocomplete({ label, value, options, onChange, placeholder }: AutocompleteProps) {
  const [open, setOpen] = useState(false)
  const matches = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return options.slice(0, 8)
    return options.filter((item) => item.toLowerCase().includes(query)).slice(0, 8)
  }, [options, value])

  return <label className="autocomplete-field">{label}
    <div className="autocomplete">
      <input
        value={value}
        onChange={(event) => { onChange(event.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && matches.length > 0 && <div className="suggestion-list">
        {matches.map((item) => <button type="button" key={item} onMouseDown={() => { onChange(item); setOpen(false) }}>{highlight(item, value)}</button>)}
      </div>}
    </div>
  </label>
}

type MultiAutocompleteProps = {
  label: string
  values: string[]
  options: string[]
  onChange: (values: string[]) => void
}

export function MultiAutocomplete({ label, values, options, onChange }: MultiAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const matches = options.filter((item) => !values.includes(item) && item.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
  const add = (item: string) => { onChange([...values, item]); setQuery(''); setOpen(false) }

  return <label className="autocomplete-field">{label}
    <div className="multi-autocomplete">
      <div className="selected-tags">{values.map((item) => <span key={item}>{item}<button type="button" onClick={() => onChange(values.filter((value) => value !== item))}>×</button></span>)}</div>
      <div className="autocomplete">
        <input value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} placeholder="Type to add a country" autoComplete="off" />
        {open && matches.length > 0 && <div className="suggestion-list">{matches.map((item) => <button type="button" key={item} onMouseDown={() => add(item)}>{highlight(item, query)}</button>)}</div>}
      </div>
    </div>
  </label>
}

function highlight(text: string, query: string) {
  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (!query || index < 0) return text
  return <>{text.slice(0, index)}<strong>{text.slice(index, index + query.length)}</strong>{text.slice(index + query.length)}</>
}
