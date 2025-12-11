from enum import Enum

class AuditFileType(str, Enum):
    
    financial_report = "financial_report"
    checklist_template = "checklist_template"
    
class BlockType(str, Enum):
    Section = "Section"
    Information = "Information"
    RadioQuestion = "RadioQuestion"
    TextQuestion = "TextQuestion"
    MultiQuestionContainer = "MultiQuestionContainer"
