"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Loader2,
  User,
  Mail,
  Phone,
  Briefcase,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SupplierDetail {
  id: string
  name: string
  contactName: string | null
  email: string
  phone: string | null
  createdAt?: any
  updatedAt?: any
}

interface SuppliersClientProps {
  initialSuppliers: SupplierDetail[]
}

// ---------------------------------------------------------------------------
// Supplier Add/Edit Modal Form
// ---------------------------------------------------------------------------

interface ManageModalProps {
  supplier: SupplierDetail | null // null for Add mode
  onClose: () => void
  onSave: (data: any) => Promise<void>
  isSaving: boolean
}

function ManageSupplierModal({ supplier, onClose, onSave, isSaving }: ManageModalProps) {
  const [name, setName] = useState(supplier?.name ?? "")
  const [contactName, setContactName] = useState(supplier?.contactName ?? "")
  const [email, setEmail] = useState(supplier?.email ?? "")
  const [phone, setPhone] = useState(supplier?.phone ?? "")
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")

    if (!name.trim()) return setErrorMsg("Company Name is required.")
    if (!email.trim()) return setErrorMsg("Email is required.")
    if (!/\S+@\S+\.\S+/.test(email)) return setErrorMsg("Invalid email address format.")

    try {
      await onSave({
        id: supplier?.id || null,
        name: name.trim(),
        contactName: contactName.trim() || null,
        email: email.trim(),
        phone: phone.trim() || null,
      })
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save supplier details.")
    }
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div style={{
        width: "100%", maxWidth: "450px",
        backgroundColor: "#0d0d0f",
        border: "1px solid #27272a",
        borderRadius: "12px",
        boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid #18181b",
        }}>
          <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#f4f4f5" }}>
            {supplier ? `Edit ${supplier.name}` : "Register New Supplier"}
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#71717a", padding: "4px" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {errorMsg && (
            <div style={{
              padding: "10px 14px", borderRadius: "6px",
              backgroundColor: "#ef444415", border: "1px solid #ef444440",
              color: "#ef4444", fontSize: "12px", fontWeight: 500,
            }}>
              {errorMsg}
            </div>
          )}

          {/* Name */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
              Company Name
            </label>
            <input
              type="text"
              placeholder="e.g. Apex Distribution Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box", height: "36px",
                backgroundColor: "#09090b", border: "1px solid #27272a",
                borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: "#f4f4f5",
                outline: "none",
              }}
            />
          </div>

          {/* Contact Person */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
              Contact Person
            </label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box", height: "36px",
                backgroundColor: "#09090b", border: "1px solid #27272a",
                borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: "#f4f4f5",
                outline: "none",
              }}
            />
          </div>

          {/* Email */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. sales@apex.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box", height: "36px",
                backgroundColor: "#09090b", border: "1px solid #27272a",
                borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: "#f4f4f5",
                outline: "none",
              }}
            />
          </div>

          {/* Phone */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
              Phone Number
            </label>
            <input
              type="text"
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box", height: "36px",
                backgroundColor: "#09090b", border: "1px solid #27272a",
                borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: "#f4f4f5",
                outline: "none",
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0 14px", height: "36px", borderRadius: "6px",
                backgroundColor: "transparent", border: "1px solid #27272a",
                color: "#a1a1aa", fontSize: "12px", cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "0 18px", height: "36px", borderRadius: "6px",
                background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
                border: "none", color: "#fff", fontSize: "12px", fontWeight: 700,
                cursor: isSaving ? "not-allowed" : "pointer",
              }}
            >
              {isSaving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : null}
              {supplier ? "Save Changes" : "Register Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main SuppliersClient
// ---------------------------------------------------------------------------

export function SuppliersClient({ initialSuppliers }: SuppliersClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [modalSupplier, setModalSupplier] = useState<SupplierDetail | null>(null)
  const [showModal, setShowModal] = useState(false)

  const queryClient = useQueryClient()

  // Poll database every 5 seconds for supplier telemetry
  const { data: suppliers = [] } = useQuery<SupplierDetail[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers")
      const json = await res.json()
      if (json.status === "error") throw new Error(json.message)
      return json.data
    },
    initialData: initialSuppliers,
    refetchInterval: 5000,
  })

  // Create/Update supplier mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || json.status === "error") throw new Error(json.message || "Failed to save supplier")
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
    onError: (err) => {
      alert(err.message)
    },
  })

  // Delete supplier mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/suppliers?id=${id}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok || json.status === "error") throw new Error(json.message || "Failed to delete supplier")
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
    onError: (err) => {
      alert(err.message)
    },
  })

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove supplier "${name}"? This could affect linked products.`)) {
      deleteMutation.mutate(id)
    }
  }

  const openAddModal = () => {
    setModalSupplier(null)
    setShowModal(true)
  }

  const openEditModal = (supplier: SupplierDetail) => {
    setModalSupplier(supplier)
    setShowModal(true)
  }

  // Filter list
  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contactName && s.contactName.toLowerCase().includes(q)) ||
      s.email.toLowerCase().includes(q) ||
      (s.phone && s.phone.toLowerCase().includes(q))
    )
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: "#f4f4f5", fontFamily: "inherit" }}>
      
      {/* Search & Header Actions */}
      <Card style={{ backgroundColor: "#09090b", border: "1px solid #18181b", padding: "16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", fontSize: "12px" }}>
          
          {/* Search */}
          <div style={{ flex: 1, minWidth: "250px", display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", padding: "0 12px", height: "36px" }}>
            <Search size={13} color="#52525b" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company name, contact person, or email..."
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#d4d4d8", fontSize: "12px" }}
            />
          </div>

          {/* Add Supplier button */}
          <button
            onClick={openAddModal}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "0 16px", height: "36px", borderRadius: "8px",
              background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
              border: "none", cursor: "pointer",
              fontSize: "12px", fontWeight: 700, color: "#fff",
              marginLeft: "auto",
            }}
          >
            <Plus size={13} />
            Add Supplier
          </button>
        </div>
      </Card>

      {/* Supplier List Grid */}
      <Card style={{ backgroundColor: "#09090b", border: "1px solid #18181b", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #18181b", backgroundColor: "#0c0c0e", color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", fontSize: "10px" }}>
                <th style={{ padding: "12px 16px" }}>Company Name</th>
                <th style={{ padding: "12px 16px" }}>Contact Person</th>
                <th style={{ padding: "12px 16px" }}>Email</th>
                <th style={{ padding: "12px 16px" }}>Phone</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ color: "#d4d4d8" }}>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#52525b", fontStyle: "italic" }}>
                    No wholesale suppliers registered yet.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    style={{ borderBottom: "1px solid #18181b", transition: "background-color 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#131315")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {/* Name */}
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#f4f4f5" }}>
                      {supplier.name}
                    </td>

                    {/* Contact Person */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <User size={12} color="#71717a" />
                        {supplier.contactName || <span style={{ color: "#52525b", fontStyle: "italic" }}>Not Specified</span>}
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: "12px 16px", fontFamily: "monospace" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Mail size={12} color="#71717a" />
                        {supplier.email}
                      </div>
                    </td>

                    {/* Phone */}
                    <td style={{ padding: "12px 16px", fontFamily: "monospace" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Phone size={12} color="#71717a" />
                        {supplier.phone || <span style={{ color: "#52525b" }}>—</span>}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                        <button
                          onClick={() => openEditModal(supplier)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "#52525b", padding: "4px", transition: "color 0.15s"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#3B82F6")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id, supplier.name)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "#52525b", padding: "4px", transition: "color 0.15s"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <ManageSupplierModal
          supplier={modalSupplier}
          onClose={() => setShowModal(false)}
          onSave={async (payload) => {
            await saveMutation.mutateAsync(payload)
          }}
          isSaving={saveMutation.isPending}
        />
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
