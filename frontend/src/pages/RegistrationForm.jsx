// src/pages/RegistrationForm.jsx
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { QRCodeCanvas } from "qrcode.react";
import Select from "react-select";
import kenyaCounties from "../data/kenya-counties.json";

import { getFirestore, doc, setDoc, collection, GeoPoint } from "firebase/firestore";
import app from "../firebase/firebaseConfig";

const db = getFirestore(app);

// ✅ Fix missing marker icons for Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

export default function RegistrationForm() {
  const [step, setStep] = useState(1);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    childId: `VAC-KE-${Date.now()}`,
    childName: "",
    birthCertificate: "",
    dateOfBirth: "",
    birthWeight: "",
    gender: "",
    guardianName: "",
    guardianEmail: "",
    relationship: "",
    contact: "+254",
    county: "",
    subCounty: "",
    ward: "",
    coordinates: null,
    photo: null,
    registeredBy: "CHW",
    timestamp: new Date().toISOString(),
  });

  // 🧭 Map click handler
  function LocationMarker() {
    useMapEvents({
      click(e) {
        setFormData((f) => ({ ...f, coordinates: e.latlng }));
      },
    });
    return formData.coordinates ? <Marker position={formData.coordinates} /> : null;
  }

  // 📸 Handle Photo Upload
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    const reader = new FileReader();
    reader.onloadend = () => setFormData((f) => ({ ...f, photo: reader.result }));
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  // 💉 Vaccine schedule generator
  const vaccineTemplate = [
    { name: "BCG", doseLabel: "Dose 1", weeksAfterBirth: 0 },
    { name: "OPV0", doseLabel: "Birth dose", weeksAfterBirth: 0 },
    { name: "HepB", doseLabel: "Birth dose", weeksAfterBirth: 0 },
    { name: "OPV", doseLabel: "Dose 1", weeksAfterBirth: 6 },
    { name: "Pentavalent (DTP-HepB-Hib)", doseLabel: "Dose 1", weeksAfterBirth: 6 },
    { name: "PCV", doseLabel: "Dose 1", weeksAfterBirth: 6 },
    { name: "Rotavirus", doseLabel: "Dose 1", weeksAfterBirth: 6 },
    { name: "OPV", doseLabel: "Dose 2", weeksAfterBirth: 10 },
    { name: "Pentavalent (DTP-HepB-Hib)", doseLabel: "Dose 2", weeksAfterBirth: 10 },
    { name: "PCV", doseLabel: "Dose 2", weeksAfterBirth: 10 },
    { name: "Rotavirus", doseLabel: "Dose 2", weeksAfterBirth: 10 },
    { name: "OPV", doseLabel: "Dose 3", weeksAfterBirth: 14 },
    { name: "Pentavalent (DTP-HepB-Hib)", doseLabel: "Dose 3", weeksAfterBirth: 14 },
    { name: "PCV", doseLabel: "Dose 3", weeksAfterBirth: 14 },
    { name: "Measles-Rubella (MR)", doseLabel: "Dose 1", weeksAfterBirth: 39 },
    { name: "Yellow Fever", doseLabel: "Dose 1", weeksAfterBirth: 39 },
    { name: "Measles-Rubella (MR)", doseLabel: "Dose 2", weeksAfterBirth: 78 },
    { name: "OPV", doseLabel: "Booster", weeksAfterBirth: 78 },
  ];

  const generateSchedule = () => {
    if (!formData.dateOfBirth) return [];
    const dob = new Date(formData.dateOfBirth);
    return vaccineTemplate.map((v, i) => {
      const due = new Date(dob);
      due.setDate(due.getDate() + v.weeksAfterBirth * 7);
      return {
        id: i + 1,
        vaccine: v.name,
        doseLabel: v.doseLabel,
        dueDate: due.toISOString().split("T")[0],
        status: "Pending",
      };
    });
  };

  // 🧾 Form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.childName || !formData.dateOfBirth) {
      toast.error("Please fill in the child's name and date of birth.");
      return;
    }
    setShowPreview(true);
  };

  // ✅ Save to Firestore
  const confirmSave = async () => {
    setIsSaving(true);
    try {
      const childRef = doc(collection(db, "children"), formData.childId);
      await setDoc(childRef, {
        ...formData,
        coordinates: formData.coordinates
          ? new GeoPoint(formData.coordinates.lat, formData.coordinates.lng)
          : null,
      });

      const schedule = generateSchedule();
      for (const dose of schedule) {
        const doseRef = doc(collection(db, `children/${formData.childId}/schedule`));
        await setDoc(doseRef, dose);
      }

      toast.success(`✅ Child ${formData.childName} registered successfully!`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error(err);
      toast.error("❌ Error saving child data. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // 🎨 Styles
  const labelStyle = { fontWeight: 700, color: "#222", display: "block", marginBottom: 6 };
  const inputStyle = { padding: "10px", borderRadius: 6, border: "1px solid #ccc", width: "100%" };

  // 🌍 Location dropdowns
  const counties = kenyaCounties.map((c) => ({ value: c.county_name, label: c.county_name }));
  const selectedCounty = kenyaCounties.find((c) => c.county_name === formData.county);
  const subCounties =
    selectedCounty?.constituencies.map((s) => ({
      value: s.constituency_name,
      label: s.constituency_name,
    })) || [];
  const selectedSubCounty = selectedCounty?.constituencies.find(
    (s) => s.constituency_name === formData.subCounty
  );
  const wards =
    selectedSubCounty?.wards.map((w) => ({
      value: w,
      label: w,
    })) || [];

  return (
    <div
      style={{
        maxWidth: 850,
        margin: "24px auto",
        padding: 24,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ textAlign: "center", color: "#1b5e20" }}>👶 Child Registration</h2>
      <p style={{ textAlign: "center", color: "#666" }}>Step {step} / 3</p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
        {/* Step 1 */}
        {step === 1 && (
          <>
            <label style={labelStyle}>Child Name</label>
            <input style={inputStyle} value={formData.childName} onChange={(e) => setFormData({ ...formData, childName: e.target.value })} required />

            <label style={labelStyle}>Birth Certificate No.</label>
            <input style={inputStyle} value={formData.birthCertificate} onChange={(e) => setFormData({ ...formData, birthCertificate: e.target.value })} />

            <label style={labelStyle}>Date of Birth</label>
            <input type="date" max={new Date().toISOString().split("T")[0]} style={inputStyle} value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} required />

            <label style={labelStyle}>Birth Weight (kg)</label>
            <input type="number" step="0.1" style={inputStyle} value={formData.birthWeight} onChange={(e) => setFormData({ ...formData, birthWeight: e.target.value })} />

            <label style={labelStyle}>Gender</label>
            <select style={inputStyle} value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
            </select>

            <label style={labelStyle}>Upload Photo</label>
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
            {photoPreview && <img src={photoPreview} alt="Preview" style={{ marginTop: 10, maxHeight: 120, borderRadius: 8 }} />}
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <label style={labelStyle}>Guardian Name</label>
            <input style={inputStyle} value={formData.guardianName} onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })} required />

            <label style={labelStyle}>Contact</label>
            <input style={inputStyle} value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} required />

            <label style={labelStyle}>Email</label>
            <input style={inputStyle} value={formData.guardianEmail} onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })} />

            <label style={labelStyle}>Relationship</label>
            <select style={inputStyle} value={formData.relationship} onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}>
              <option value="">Select</option>
              <option>Mother</option>
              <option>Father</option>
              <option>Guardian</option>
            </select>
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            <label style={labelStyle}>County</label>
            <Select
              options={counties}
              value={formData.county ? { value: formData.county, label: formData.county } : null}
              onChange={(selected) => setFormData({ ...formData, county: selected?.value || "", subCounty: "", ward: "" })}
              placeholder="Search or select county..."
              isClearable
              isSearchable
            />

            {subCounties.length > 0 && (
              <>
                <label style={labelStyle}>Sub-County</label>
                <Select
                  options={subCounties}
                  value={formData.subCounty ? { value: formData.subCounty, label: formData.subCounty } : null}
                  onChange={(selected) => setFormData({ ...formData, subCounty: selected?.value || "", ward: "" })}
                  placeholder="Search or select sub-county..."
                  isClearable
                  isSearchable
                />
              </>
            )}

            {wards.length > 0 && (
              <>
                <label style={labelStyle}>Ward</label>
                <Select
                  options={wards}
                  value={formData.ward ? { value: formData.ward, label: formData.ward } : null}
                  onChange={(selected) => setFormData({ ...formData, ward: selected?.value || "" })}
                  placeholder="Search or select ward..."
                  isClearable
                  isSearchable
                />
              </>
            )}

            <label style={labelStyle}>Select GPS Location (Click map)</label>
            <div style={{ height: 250, borderRadius: 8, overflow: "hidden" }}>
              <MapContainer center={[-1.286389, 36.817223]} zoom={7} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationMarker />
              </MapContainer>
            </div>
            {formData.coordinates && (
              <p>
                Selected: {formData.coordinates.lat.toFixed(5)}, {formData.coordinates.lng.toFixed(5)}
              </p>
            )}
          </>
        )}

        {/* Step Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
          {step > 1 && <button type="button" onClick={() => setStep((s) => s - 1)} style={{ padding: "10px 14px", background: "#ddd", borderRadius: 6 }}>Back</button>}
          {step < 3 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} style={{ padding: "10px 14px", background: "#1b5e20", color: "#fff", borderRadius: 6 }}>Next</button>
          ) : (
            <button type="submit" style={{ padding: "10px 14px", background: "#1b5e20", color: "#fff", borderRadius: 6 }}>Preview & Save</button>
          )}
        </div>
      </form>

      {/* ✅ Preview Section */}
      {showPreview && (
        <div style={{ marginTop: 18, padding: 14, borderRadius: 8, background: "#fbfbfb", border: "1px solid #eee" }}>
          <h3>Preview — {formData.childName}</h3>
          {formData.photo && <img src={formData.photo} alt="child" style={{ width: 110, borderRadius: 8 }} />}
          <QRCodeCanvas value={formData.birthCertificate?.trim() || formData.childId} size={110} />
          <ul>
            {generateSchedule().map((d) => (
              <li key={d.id}>
                <strong>{d.vaccine}</strong> ({d.doseLabel}) — due {d.dueDate}
              </li>
            ))}
          </ul>
          <div>
            <button onClick={confirmSave} disabled={isSaving} style={{ padding: "10px 14px", background: isSaving ? "#999" : "#1b5e20", color: "#fff", borderRadius: 6, marginRight: 8 }}>
              {isSaving ? "⏳ Saving..." : "Confirm & Save"}
            </button>
            <button onClick={() => setShowPreview(false)} style={{ padding: "10px 14px", background: "#ddd", borderRadius: 6 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <ToastContainer position="top-center" />
    </div>
  );
}