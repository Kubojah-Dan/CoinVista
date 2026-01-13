import React, { useState, useContext } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AuthContext } from "../context/AuthContext"

const Login = () => {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    })

    const { login } = useContext(AuthContext)
    const navigate = useNavigate()

    const { email, password } = formData

    const onChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value })

    const onSubmit = async (e) => {
        e.preventDefault()
        const success = await login({ email, password })
        if (success) {
            navigate("/dashboard")
        }
    }

    return (
        <div className="flex justify-center items-center min-h-screen bg-base-200 py-12">
            <div className="card w-96 bg-base-100 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title justify-center text-3xl mb-4">Login</h2>

                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="form-control w-full">
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
                                placeholder="Enter password"
                                className="input input-bordered w-full"
                                name="password"
                                value={password}
                                onChange={onChange}
                                required
                            />
                        </div>

                        <div className="card-actions justify-end mt-6">
                            <button className="btn btn-primary w-full">Login</button>
                        </div>
                    </form>

                    <div className="text-center mt-4">
                        <p className="text-sm">
                            Don't have an account?{' '}
                            <Link to="/signup" className="link link-primary">
                                Sign Up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login;
