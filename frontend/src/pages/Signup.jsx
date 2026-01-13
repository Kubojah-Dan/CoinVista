import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const { name, email, password, confirmPassword } = formData;

    const onChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        const success = await register({ name, email, password });
        if (success) {
            navigate('/dashboard');
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-base-200 py-12">
            <div className="card w-96 bg-base-100 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title justify-center text-3xl mb-4">Sign Up</h2>
                    <form onSubmit={onSubmit}>
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text">Name</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Enter your name"
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
                                placeholder="Create password"
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
                                placeholder="Confirm password"
                                className="input input-bordered w-full"
                                name="confirmPassword"
                                value={confirmPassword}
                                onChange={onChange}
                                required
                            />
                        </div>
                        <div className="card-actions justify-end mt-6">
                            <button className="btn btn-primary w-full">Sign Up</button>
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

export default Signup;
