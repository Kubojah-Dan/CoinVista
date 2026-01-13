import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const { name, email, password, confirmPassword } = formData;

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    const success = await register({ name, email, password });
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-base-200 py-12">
      <div className="card w-full max-w-md shadow-2xl bg-base-100 items-center">
        <div className="card-body w-full">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold">Create Account</h2>
            <p className="text-gray-500">Join CoinVista today</p>
          </div>
          <form onSubmit={onSubmit}>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Full Name</span>
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                className="input input-bordered w-full"
                name="name"
                value={name}
                onChange={onChange}
                required
              />
            </div>
            <div className="form-control w-full mt-4">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                className="input input-bordered w-full"
                name="email"
                value={email}
                onChange={onChange}
                required
              />
            </div>
            <div className="form-control w-full mt-4">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                placeholder="Create a password"
                className="input input-bordered w-full"
                name="password"
                value={password}
                onChange={onChange}
                required
              />
            </div>
            <div className="form-control w-full mt-4">
              <label className="label">
                <span className="label-text">Confirm Password</span>
              </label>
              <input
                type="password"
                placeholder="Confirm your password"
                className="input input-bordered w-full"
                name="confirmPassword"
                value={confirmPassword}
                onChange={onChange}
                required
              />
            </div>
            <div className="form-control mt-6">
              <button className="btn btn-primary">Sign Up</button>
            </div>
          </form>
          <div className="text-center mt-4">
            <p className="text-sm">
              Already have an account?{' '}
              <Link to="/login" className="link link-primary">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;