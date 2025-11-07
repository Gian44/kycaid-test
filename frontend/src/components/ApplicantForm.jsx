import { useState } from 'react'
import axios from 'axios'

function ApplicantForm({ onSuccess }) {
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
      const response = await axios.post('/api/applicants', formData)
      if (response.data.applicant_id) {
        onSuccess(response.data.applicant_id)
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create applicant')
      console.error('Error creating applicant:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-container">
      <h2>Create Applicant</h2>
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
          <label htmlFor="email">Email *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
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
          <label htmlFor="phone">Phone</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+1234567890"
          />
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

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Creating...' : 'Create Applicant'}
        </button>
      </form>
    </div>
  )
}

export default ApplicantForm

