import { useState, useEffect } from 'react'
import axios from 'axios'

function ApplicantForm({ onSuccess, initialData, idFileId, documentType }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    type: 'PERSON',
    first_name: '',
    last_name: '',
    email: '',
    dob: '',
    residence_country: 'US',
    phone: ''
  })
  const [addressData, setAddressData] = useState({
    type: 'REGISTERED',
    country: 'US',
    state_or_province: '',
    city: '',
    postal_code: '',
    street_name: '',
    building_number: '',
    flat_number: ''
  })
  const [hasAddress, setHasAddress] = useState(false)

  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return ''
    // Try to parse various date formats
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      // Try MM/DD/YYYY or DD/MM/YYYY format
      const parts = dateString.split(/[\/\-]/)
      if (parts.length === 3) {
        // Assume MM/DD/YYYY for US dates
        const month = parts[0].padStart(2, '0')
        const day = parts[1].padStart(2, '0')
        const year = parts[2]
        return `${year}-${month}-${day}`
      }
      return dateString
    }
    return date.toISOString().split('T')[0]
  }

  // Map OCR data to form fields
  useEffect(() => {
    if (initialData) {
      const mappedData = {
        first_name: initialData.first_name || initialData.firstName || '',
        last_name: initialData.last_name || initialData.lastName || '',
        email: initialData.email || '',
        dob: formatDate(initialData.dob || initialData.date_of_birth || initialData.dateOfBirth || ''),
        residence_country: initialData.residence_country || initialData.country || 'US',
        phone: initialData.phone || initialData.phone_number || ''
      }
      
      setFormData(prev => ({ ...prev, ...mappedData }))

      // Handle address if available
      if (initialData.address || initialData.street_name || initialData.city) {
        const addr = initialData.address || {}
        setAddressData({
          type: 'REGISTERED',
          country: addr.country || initialData.country || 'US',
          state_or_province: addr.state_or_province || addr.state || initialData.state || '',
          city: addr.city || initialData.city || '',
          postal_code: addr.postal_code || addr.zip || initialData.postal_code || initialData.zip || '',
          street_name: addr.street_name || addr.street || initialData.street_name || initialData.street || '',
          building_number: addr.building_number || addr.building || initialData.building_number || initialData.building || '',
          flat_number: addr.flat_number || addr.apt || initialData.flat_number || initialData.apt || ''
        })
        setHasAddress(true)
      }
    }
  }, [initialData])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleAddressChange = (e) => {
    setAddressData({
      ...addressData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Create applicant
      const response = await axios.post('/api/applicants', formData)
      if (!response.data.applicant_id) {
        throw new Error('Failed to create applicant')
      }

      const applicantId = response.data.applicant_id

      // Create address if available
      let addressId = null
      if (hasAddress && (addressData.street_name || addressData.city)) {
        try {
          const addressResponse = await axios.post('/api/addresses', {
            applicant_id: applicantId,
            ...addressData
          })
          addressId = addressResponse.data.address_id
        } catch (addrErr) {
          console.warn('Failed to create address:', addrErr)
          // Don't fail the whole process if address creation fails
        }
      }

      // Create document with the uploaded ID file if available
      if (idFileId) {
        try {
          await axios.post('/api/documents', {
            applicant_id: applicantId,
            type: documentType || 'DRIVERS',
            front_side_id: idFileId
          })
        } catch (docErr) {
          console.warn('Failed to create document:', docErr)
          // Don't fail the whole process if document creation fails
        }
      }

      onSuccess(applicantId, addressId)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create applicant')
      console.error('Error creating applicant:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-container">
      <h2>Review Applicant Information</h2>
      <p className="form-hint">Please review and edit the information extracted from your ID. All fields are editable.</p>
      <form onSubmit={handleSubmit} className="applicant-form">
        <div className="form-group">
          <label htmlFor="first_name">First Name *</label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="last_name">Last Name *</label>
          <input
            type="text"
            id="last_name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email {!formData.email && '(Optional)'}</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required={!!formData.email}
            placeholder="email@example.com"
          />
          {!formData.email && (
            <small className="form-hint">Email not found on ID. Please enter manually if needed.</small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="dob">Date of Birth *</label>
          <input
            type="date"
            id="dob"
            name="dob"
            value={formData.dob}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone {!formData.phone && '(Optional)'}</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+1234567890"
          />
          {!formData.phone && (
            <small className="form-hint">Phone number not found on ID. Please enter manually if needed.</small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="residence_country">Residence Country *</label>
          <select
            id="residence_country"
            name="residence_country"
            value={formData.residence_country}
            onChange={handleChange}
            required
          >
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="ES">Spain</option>
            <option value="IT">Italy</option>
            <option value="JP">Japan</option>
            <option value="CN">China</option>
          </select>
        </div>

        {/* Address fields if address was extracted */}
        {hasAddress && (
          <div className="address-section" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
            <h3>Address Information</h3>
            
            <div className="form-group">
              <label htmlFor="street_name">Street Name *</label>
              <input
                type="text"
                id="street_name"
                name="street_name"
                value={addressData.street_name}
                onChange={handleAddressChange}
                required
                placeholder="e.g., Main Street"
              />
            </div>

            <div className="form-group">
              <label htmlFor="building_number">Building Number *</label>
              <input
                type="text"
                id="building_number"
                name="building_number"
                value={addressData.building_number}
                onChange={handleAddressChange}
                required
                placeholder="e.g., 123"
              />
            </div>

            <div className="form-group">
              <label htmlFor="flat_number">Apartment/Flat Number</label>
              <input
                type="text"
                id="flat_number"
                name="flat_number"
                value={addressData.flat_number}
                onChange={handleAddressChange}
                placeholder="e.g., Apt 4B"
              />
            </div>

            <div className="form-group">
              <label htmlFor="city">City *</label>
              <input
                type="text"
                id="city"
                name="city"
                value={addressData.city}
                onChange={handleAddressChange}
                required
                placeholder="e.g., Los Angeles"
              />
            </div>

            <div className="form-group">
              <label htmlFor="state_or_province">State/Province *</label>
              <input
                type="text"
                id="state_or_province"
                name="state_or_province"
                value={addressData.state_or_province}
                onChange={handleAddressChange}
                required
                placeholder="e.g., California"
              />
            </div>

            <div className="form-group">
              <label htmlFor="postal_code">Postal Code *</label>
              <input
                type="text"
                id="postal_code"
                name="postal_code"
                value={addressData.postal_code}
                onChange={handleAddressChange}
                required
                placeholder="e.g., 90001"
              />
            </div>

            <div className="form-group">
              <label htmlFor="address_country">Country *</label>
              <select
                id="address_country"
                name="country"
                value={addressData.country}
                onChange={handleAddressChange}
                required
              >
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="ES">Spain</option>
                <option value="IT">Italy</option>
                <option value="JP">Japan</option>
                <option value="CN">China</option>
              </select>
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Creating...' : 'Create Applicant'}
        </button>
      </form>
    </div>
  )
}

export default ApplicantForm

