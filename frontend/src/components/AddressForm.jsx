import { useState } from 'react'
import axios from 'axios'

function AddressForm({ applicantId, onSuccess, onBack }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    applicant_id: applicantId,
    type: 'REGISTERED',
    country: 'US',
    state_or_province: '',
    city: '',
    postal_code: '',
    street_name: '',
    building_number: '',
    flat_number: ''
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await axios.post('/api/addresses', formData)
      if (response.data.address_id) {
        onSuccess(response.data.address_id)
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create address')
      console.error('Error creating address:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-container">
      <h2>Add Address</h2>
      <form onSubmit={handleSubmit} className="address-form">
        <div className="form-group">
          <label htmlFor="type">Address Type *</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
          >
            <option value="REGISTERED">Registered</option>
            <option value="RESIDENTIAL">Residential</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="country">Country *</label>
          <select
            id="country"
            name="country"
            value={formData.country}
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

        <div className="form-group">
          <label htmlFor="state_or_province">State/Province</label>
          <input
            type="text"
            id="state_or_province"
            name="state_or_province"
            value={formData.state_or_province}
            onChange={handleChange}
            placeholder="e.g., California"
          />
        </div>

        <div className="form-group">
          <label htmlFor="city">City *</label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
            placeholder="e.g., Los Angeles"
          />
        </div>

        <div className="form-group">
          <label htmlFor="postal_code">Postal Code *</label>
          <input
            type="text"
            id="postal_code"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            required
            placeholder="e.g., 90001"
          />
        </div>

        <div className="form-group">
          <label htmlFor="street_name">Street Name *</label>
          <input
            type="text"
            id="street_name"
            name="street_name"
            value={formData.street_name}
            onChange={handleChange}
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
            value={formData.building_number}
            onChange={handleChange}
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
            value={formData.flat_number}
            onChange={handleChange}
            placeholder="e.g., Apt 4B"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="button-group">
          <button type="button" onClick={onBack} className="back-button">
            ← Back
          </button>
          <button type="submit" disabled={loading} className="submit-button">
            {loading ? 'Creating...' : 'Create Address'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddressForm

