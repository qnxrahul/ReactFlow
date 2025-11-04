import type { NodeProps } from '@xyflow/react'
import { FiFileText } from 'react-icons/fi'

export type UploadLaneData = {
  title: string
  files: string[]
  onFilesChange?: (files: FileList | null) => void
}

export function UploadLaneNode({ data }: NodeProps<UploadLaneData>) {
  return (
    <div className="upload-lane">
      <div className="upload-lane__header">
        <strong>{data.title}</strong>
        <span>{data.files.length} files</span>
      </div>
      <div className="upload-lane__body">
        {data.files.map((file) => (
          <div key={file} className="upload-lane__file">
            <FiFileText className="upload-lane__file-icon" aria-hidden />
            <span className="upload-lane__file-name">{file}</span>
          </div>
        ))}
        {data.files.length === 0 && <div className="upload-lane__empty">Drop files or click to upload</div>}
        <label
          className="upload-lane__upload"
          onMouseDown={(evt) => evt.stopPropagation()}
        >
          <input
            type="file"
            multiple
            onChange={(evt) => {
              data.onFilesChange?.(evt.target.files)
              if (evt.target) {
                evt.target.value = ''
              }
            }}
          />
          Upload files
        </label>
      </div>
    </div>
  )
}

export default UploadLaneNode
