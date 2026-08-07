import { supabase } from "../lib/supabase";

export type DocumentType = "student_id_card" | "staff_id_card" | "report_card" | "admission_letter";

// generated_documents still sits on Phase 1's blanket "any authenticated
// school member" write policy (see Phase 6's security review) — fine
// for an insert-only audit trail like this, where the risk of an
// over-broad policy is someone logging a document they didn't
// generate, not any actual data exposure.
export async function logDocumentGenerated(input: {
  schoolId: string; documentType: DocumentType; generatedBy: string;
  relatedStudentId?: string; relatedStaffId?: string; fileUrl?: string;
}) {
  await supabase.from("generated_documents").insert({
    school_id: input.schoolId, document_type: input.documentType, generated_by: input.generatedBy,
    related_student_id: input.relatedStudentId ?? null, related_staff_id: input.relatedStaffId ?? null,
    file_url: input.fileUrl ?? null
  });
}
