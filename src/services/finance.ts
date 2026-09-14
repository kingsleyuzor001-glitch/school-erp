import { supabase } from "../lib/supabase";

export interface FeeStructure {
  id: string;
  class_id: string;
  term_id: string;
  amount: number;
}

export interface FinanceSummary {
  total_expected: number;
  total_collected: number;
  total_outstanding: number;
  student_count: number;
  debtor_count: number;
}

export interface StudentBalance {
  student_id: string;
  full_name: string;
  admission_number: string;
  class_name: string;
  expected: number;
  paid: number;
  balance: number;
}

export interface StudentPayment {
  id: string;
  amount_paid: number;
  payment_method: string;
  receipt_number: string;
  payment_date: string;
  reference_note: string | null;
}

export async function listFeeStructures(termId: string): Promise<FeeStructure[]> {
  const { data, error } = await supabase.from("fee_structures").select("*").eq("term_id", termId);
  if (error) throw error;
  return data as FeeStructure[];
}

export async function setFeeStructure(schoolId: string, classId: string, termId: string, amount: number) {
  return supabase.from("fee_structures").upsert(
    { school_id: schoolId, class_id: classId, term_id: termId, amount },
    { onConflict: "school_id,class_id,term_id" }
  );
}

export async function getFinanceSummary(termId: string): Promise<FinanceSummary> {
  const { data, error } = await supabase.rpc("get_finance_summary", { p_term_id: termId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as FinanceSummary;
}

export async function getStudentBalances(termId: string): Promise<StudentBalance[]> {
  const { data, error } = await supabase.rpc("get_student_balances", { p_term_id: termId });
  if (error) throw error;
  return data as StudentBalance[];
}

export async function getStudentPayments(studentId: string, termId: string): Promise<StudentPayment[]> {
  const { data, error } = await supabase.rpc("get_student_payments", { p_student_id: studentId, p_term_id: termId });
  if (error) throw error;
  return data as StudentPayment[];
}

export async function recordPayment(input: {
  studentId: string; termId: string; amount: number; method: string; note?: string;
}) {
  const { data, error } = await supabase.rpc("record_fee_payment", {
    p_student_id: input.studentId, p_term_id: input.termId, p_amount: input.amount,
    p_method: input.method, p_note: input.note || null
  });
  if (error) return { receipt: null, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { receipt: row as { id: string; receipt_number: string }, error: null };
}