import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import FileUpload from '../components/FileUpload/FileUpload'
import boardConfig from '../config/boardConfig.json'
import { recordWorkflowStep } from '../services/workspaceApi'
import { LAST_CREATED_WORKSPACE_KEY } from '../constants/workspace'
import { useBoards, type WorkspaceBoard, type WorkspaceLane } from '../state/BoardsProvider'
import './NewBoard/NewBoard.css'
import '../workspace-board.css'
import './MappingPage.css'

type SectionConfig = (typeof boardConfig.sections)[number]

type MappingSection = SectionConfig & {
  files: string[]
  persistedFiles: string[]
}

const uploadableSections = boardConfig.sections.filter((section) =>
  ['items-to-test', 'sample-documentation'].includes(section.id),
)

const mappingTodos = [
  'Validate AI extracted tags',
  'Pair samples to evidence',
  'Confirm control IDs',
  'Flag missing attachments',
  'Prep for workpaper handoff',
]

const createSectionState = (section: SectionConfig): MappingSection => ({
  ...section,
  files: [],
  persistedFiles: [],
})

const sectionToLane = (section: MappingSection): WorkspaceLane => ({
  id: section.id,
  title: section.title,
  files: [...section.files],
})

const mergeBoardLanes = (board: WorkspaceBoard | null, replacements: WorkspaceLane[]): WorkspaceLane[] => {
  const replacementMap = new Map<string, WorkspaceLane>()
  replacements.forEach((lane) => {
    replacementMap.set(lane.id, lane)
  })

  const base = board?.lanes ?? []
  const merged: WorkspaceLane[] = base.map((lane) => {
    const replacement = replacementMap.get(lane.id)
    if (replacement) {
      replacementMap.delete(lane.id)
      return { ...lane, files: [...replacement.files], title: replacement.title }
    }
    return lane
  })

  replacementMap.forEach((lane) => merged.push(lane))
  return merged
}

export default function MappingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { boards, updateBoard, uploadFile } = useBoards()

  const locationWorkspaceId = (location.state as { workspaceId?: string } | null)?.workspaceId ?? null
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => {
    if (locationWorkspaceId) return locationWorkspaceId
    if (typeof window !== 'undefined') {
      return window.sessionStorage.getItem(LAST_CREATED_WORKSPACE_KEY)
    }
    return null
  })
  const workflowNavState = workspaceId ? { state: { workspaceId } } : undefined
  const [sections, setSections] = useState<MappingSection[]>(() => uploadableSections.map(createSectionState))

  useEffect(() => {
    if (locationWorkspaceId && locationWorkspaceId !== workspaceId) {
      setWorkspaceId(locationWorkspaceId)
    }
  }, [locationWorkspaceId, workspaceId])

  useEffect(() => {
    if (workspaceId && typeof window !== 'undefined') {
      window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, workspaceId)
    }
  }, [workspaceId])

  const activeBoard = useMemo(
    () => (workspaceId ? boards.find((board) => board.id === workspaceId) ?? null : null),
    [workspaceId, boards],
  )

  useEffect(() => {
    if (!workspaceId) return
    void recordWorkflowStep(workspaceId, { step: 'mapping' }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error('Failed to record mapping workflow step', error)
      }
    })
  }, [workspaceId])

  useEffect(() => {
    if (!activeBoard) return
    setSections((prev) =>
      prev.map((section) => {
        const lane =
          activeBoard.lanes?.find((item) => item.id === section.id || item.title === section.title) ?? null
        if (!lane) return section
        const laneFiles = [...(lane.files ?? [])]
        return {
          ...section,
          files: laneFiles,
          persistedFiles: laneFiles,
          fileCount: laneFiles.length,
        }
      }),
    )
  }, [activeBoard])

  const persistLaneState = useCallback(
    async (nextSections: MappingSection[], uploads: File[]) => {
      if (!workspaceId) return

      if (uploads.length) {
        try {
          await Promise.all(uploads.map((file) => uploadFile(workspaceId, file)))
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Failed to upload workspace files', error)
          }
        }
      }

      try {
        const replacementLanes = nextSections.map(sectionToLane)
        const mergedLanes = mergeBoardLanes(activeBoard ?? null, replacementLanes)
        const filesCount = mergedLanes.reduce((total, lane) => total + lane.files.length, 0)
        await updateBoard(workspaceId, (prev) => ({
          ...prev,
          lanes: mergedLanes,
          filesCount,
        }))
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to persist mapping lanes', error)
        }
      }
    },
    [workspaceId, activeBoard, updateBoard, uploadFile],
  )

  const handleFilesChange = useCallback(
    (sectionId: string, files: File[]) => {
      setSections((prev) => {
        const prevSection = prev.find((section) => section.id === sectionId)
        const previousNames = prevSection?.files ?? []
        const persistedNames = prevSection?.persistedFiles ?? []
        const incomingNames = files.map((file) => file.name)
        const mergedNames = Array.from(new Set([...persistedNames, ...incomingNames]))
        const nextSections = prev.map((section) =>
          section.id === sectionId ? { ...section, files: mergedNames, fileCount: mergedNames.length } : section,
        )
        const uploadsToSave = files.filter((file) => !previousNames.includes(file.name))
        void persistLaneState(nextSections, uploadsToSave)
        return nextSections
      })
    },
    [persistLaneState],
  )

  const handleRemovePersistedFile = useCallback(
    (sectionId: string, fileName: string) => {
      setSections((prev) => {
        const nextSections = prev.map((section) => {
          if (section.id !== sectionId) return section
          if (!section.persistedFiles.includes(fileName)) return section
          const nextPersisted = section.persistedFiles.filter((name) => name !== fileName)
          const nextFiles = section.files.filter((name) => name !== fileName)
          return {
            ...section,
            persistedFiles: nextPersisted,
            files: nextFiles,
            fileCount: nextFiles.length,
          }
        })
        void persistLaneState(nextSections, [])
        return nextSections
      })
    },
    [persistLaneState],
  )

  const itemsSection = sections.find((section) => section.id === 'items-to-test')
  const sampleSection = sections.find((section) => section.id === 'sample-documentation')

  const mappingRows = useMemo(() => {
    const left = itemsSection?.persistedFiles ?? []
    const right = sampleSection?.persistedFiles ?? []
    const max = Math.max(left.length, right.length, 1)
    return Array.from({ length: max }).map((_, idx) => {
      const source = left[idx] ?? ''
      const target = right[idx] ?? ''
      const status = source && target ? 'Paired' : 'Pending'
      return { id: idx + 1, source: source || '—', target: target || '—', status }
    })
  }, [itemsSection?.persistedFiles, sampleSection?.persistedFiles])

  const handleProceedToWorkpaper = () => {
    if (!workspaceId) return
    navigate('/workpaper', workflowNavState)
  }

  const handleAgentAction = () => {
    if (workspaceId) {
      navigate(`/new-board?boardId=${encodeURIComponent(workspaceId)}`)
      return
    }
    navigate('/new-board')
  }

  return (
    <div className="new-board mapping-page">
      <aside className="new-board__sidebar">
        <div className="workspace-todo-card">
          <div className="workspace-todo-header">
            <h2>Mapping checklist</h2>
            <span>{mappingTodos.length} cards</span>
          </div>
          <ul className="workspace-todo-items">
            {mappingTodos.map((item) => (
              <li key={item} className="workspace-todo-item">
                <label>
                  <input type="checkbox" />
                  <span>{item}</span>
                </label>
              </li>
            ))}
          </ul>
          <button className="workspace-todo-update">Update</button>
        </div>

        <div className="mapping-agent-card">
          <h3>Agent assistant</h3>
          <p>Ask the agent to summarize mappings, flag gaps, or create next-step prompts.</p>
          <button type="button" onClick={handleAgentAction}>
            Open agent workspace
          </button>
        </div>
      </aside>

      <main className="new-board__content mapping-content">
        <div className="mapping-header">
          <div>
            <p>Engagement &gt; Spaces &gt; Mapping</p>
            <h1>Document mapping</h1>
            <span>Review uploads from Items to be tested and Sample documentation, then lock the pairings.</span>
          </div>
          <div className="mapping-header__actions">
            <button type="button" onClick={handleProceedToWorkpaper}>
              Start workpaper build
            </button>
            <button type="button" className="secondary">
              Share mapping
            </button>
          </div>
        </div>

        <div className="mapping-sections-grid">
          {sections.map((section) => (
            <div key={section.id} className="new-board__section mapping-section-card">
              <div className="new-board__section-header">
                <h3 className="new-board__section-title">{section.title}</h3>
                <span className="new-board__file-count">{section.files.length} files</span>
              </div>
              <div className="new-board__section-body">
                {section.persistedFiles.length > 0 && (
                  <ul className="new-board__persisted-files">
                    {section.persistedFiles.map((file) => (
                      <li key={`${section.id}-${file}`}>
                        <span>{file}</span>
                        <button type="button" aria-label={`Remove ${file}`} onClick={() => handleRemovePersistedFile(section.id, file)}>
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <FileUpload sectionId={section.id} onFilesChange={(files) => handleFilesChange(section.id, files)} maxFiles={50} />
              </div>
            </div>
          ))}
        </div>

        <section className="mapping-table-card">
          <header>
            <div>
              <span>Document mapping table</span>
              <strong>Pair and approve files</strong>
            </div>
            <button type="button" onClick={handleProceedToWorkpaper}>
              Continue to workpaper
            </button>
          </header>
          <div className="mapping-table-wrapper">
            <table className="mapping-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Items to be tested</th>
                  <th>Sample documentation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mappingRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.source}</td>
                    <td>{row.target}</td>
                    <td>
                      <span className={row.status === 'Paired' ? 'mapping-status mapping-status--success' : 'mapping-status mapping-status--pending'}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <div className="mapping-flow-nav">
        <button type="button" onClick={() => navigate('/workspace', workflowNavState)}>
          Back to workspace
        </button>
        <button type="button" onClick={handleProceedToWorkpaper}>
          Next · Workpaper
        </button>
      </div>
    </div>
  )
}
