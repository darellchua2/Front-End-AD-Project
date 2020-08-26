// JavaScript source code

import React, { Component } from "react"
import PurchaseOrder from "../Components/PurchaseOrder"
import PurchaseOrderTable from "../Components/PurchaseOrderTable"
import Header from '../Components/Headers/Header';
import "./general.css"
import axios from 'axios';
import Pdf from "react-to-pdf";
import { Redirect } from "react-router-dom";



class PurchaseOrderSubmit extends Component {

    constructor() {
        super()
        this.state = {
            data: [],
            Allpos:[],
            currentPO: null,
            Suppliers: null,
            uSuppliers: null,
            redirect:null
        }
        this.handleChange = this.handleChange.bind(this)
        this.setUniqueSuppliers = this.setUniqueSuppliers.bind(this)

    }

    componentDidMount() {
      
        const data = [];
        const Suppliers = [];
       

        axios.get('https://localhost:5001/api/Store/getAllPOs').then(response => {
            //console.log('get all POs', response.data);
            const AllPo = response.data;


            AllPo.forEach(po => {
                const Pod = [];
                //var subTotal = 0;

                //get supplier 
                const Supplierurl = 'https://localhost:5001/api/Store/getSupplier/' + po.supplierId
                axios.get(Supplierurl).then(supplier => {
                    const sup = supplier.data


                    Suppliers.push(sup)

                    //get clerk details
                    const Clerkurl = 'https://localhost:5001/api/Store/getEmployee/' + po.clerkId
                    axios.get(Clerkurl).then(clerk => {
                        const clerk1 = clerk.data

                        const Podurl = 'https://localhost:5001/api/Store/getPOD/' + po.id
                        axios.get(Podurl).then(pod => {
                            const pods = pod.data

                            //get stationeries for description and unit
                            pods.forEach(pod => {
                                const podurl = 'https://localhost:5001/api/Store/Stationeries/' + pod.stationeryId

                                axios.get(podurl).then(stationery => {
                                    const desc = stationery.data.desc
                                    const unit = stationery.data.unit

                                    const supUrl = 'https://localhost:5001/api/Store/getSupplierItems/' + pod.stationeryId
                                    axios.get(supUrl).then(supItem => {

                                        const price = supItem.data.find(sitem => sitem.supplierId === sup.id).price
                                      
                                        const FormattedPod = {
                                            id: pod.stationeryId,
                                            desc: desc,
                                            unit: unit,
                                            qty: pod.qty,
                                            price: price
                                        }
                                        Pod.push(FormattedPod)

                                    })
                                })
                            })
                    

                            const record = {
                                poNum: po.id,
                                date: po.dateOfOrder,
                                clerk: clerk1,
                                Sname: sup.name,
                                supplierId: sup.id,
                                supplier: sup,
                                status: po.status,
                                StockAdjustmentId: po.StockAdjustmentId,
                                pod: Pod,
                                subtotal: 0
                            }

                            data.push(record)

                            //sort by supplier priority
                            data.sort((a, b) => b.poNum - a.poNum)

                        })

            
                            this.setState({
                                Allpos: data,
                                suppliers: Suppliers 

                            }, () => this.setUniqueSuppliers())

                  
                        })

                    });
                });
            })
    }

    setUniqueSuppliers() {
        const sSet = new Set(this.state.suppliers.map(s => s.id))
        const usups = []
        sSet.forEach(id => {
            const usup = this.state.suppliers.find(supplier => supplier.id == id)
            usups.push(usup)
        })

        const sorted_list = usups.sort((a, b) => b.priority- a.priority)
        this.setState({ uSuppliers: sorted_list })
        console.log('AllPOs', this.state.Allpos)

        this.setState(prevState => {
            const reorder = [...prevState.Allpos];
            const neworder = [];
            reorder.forEach(order => {
                order.subtotal = order.pod.reduce((total, p) => total + (p.qty * p.price), 0)
                neworder.push(order)
            })
            

            return ({
                data: neworder,
                Allpos: neworder
            })
    })
    }

   
    handleChange(event,index) {
        const { name, value } = event.target;
        console.log('name', name, 'value', value, 'index', index)

        if (name == 'data') {
            const newData = value == 'all' ? this.state.Allpos :
                this.state.Allpos.filter(po => po.supplierId == value)

            console.log('new data', newData)
            this.setState({
                data: newData,
                currentPO:null
            })
        }

        if (name == 'view') {
            this.setState(prevState => {
                const targetData = prevState.data[index];
                return { currentPO: targetData }
            })

        }

        if (name == "delivered") {
            this.setState(prevState => {
                const reorder = [...prevState.data];
                reorder[index] = {
                    ...reorder[index],
                    status: "delivered"
                }

                const id = reorder[index].poNum
                const temp = {id:id}
                console.log('id', id)
                axios.post('https://localhost:5001/api/Store/PORecieved/',temp).then(res => console.log(res))
                return {
                    data: reorder,
                    redirect: '/receivedGoods/'+id
                    }
            })

            console.log('redirect', this.state.redirect)
        }
    }

    render() {

        var tabs = this.state.uSuppliers != null && this.state.uSuppliers.map((item) => 
            <div>
            <button
                key={item.id}
                name="data"
                class="button"
                value={item.id}
                onClick={this.handleChange}
            >
                {item.name}
                </button>
                </div>
        )
        const ref = React.createRef();

        return (

            <div>
                {this.state.redirect != null &&
                    <Redirect to={this.state.redirect}/>
                }
                <Header />
                <div className="tableBody">
                    <div className="btn-group">
                        <button name="data" class="button" value='all' onClick={this.handleChange}>All</button>
                        {this.state.suppliers!=null && tabs}
                    </div>
                    {this.state.currentPO != null &&
                        <div>
                        <Pdf targetRef={ref} filename="PurchaseOrder.pdf">    
                            {({ toPdf }) => (
                                <button class="button" onClick={toPdf}>Export</button>
                            )}
                        </Pdf>
                        <div ref={ref}>
                            <PurchaseOrder
                                data={this.state.currentPO}
                                />
                        </div>
                    </div>
                    }
                    {this.state.currentPO == null &&
                        <PurchaseOrderTable
                            data={this.state.data}
                            handleChange={this.handleChange}
                        />}
                    </div>
                   
                </div>
           
        )


    }

}

export default PurchaseOrderSubmit
