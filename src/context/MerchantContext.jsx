import { useState, useEffect, useCallback } from 'react'
import { MerchantContext } from './MerchantContextObject.js'
import {
  loadMerchantData,
  initializeMerchantInstance,
  saveMerchantSettings,
  saveMerchantProducts,
  exportMerchantBackup,
  importMerchantBackup,
  deleteMerchantInstance,
} from '../services/storage/merchantStorage.js'
import {
  checkStorageStatus,
  requestStoragePersistence,
} from '../services/storage/indexedDbAdapter.js'

export function MerchantProvider({ children }) {
  const [instance, setInstance] = useState(null)
  const [settings, setSettings] = useState({
    businessName: 'Pokladna',
    accountNumber: '',
    bankId: '',
    currency: 'CZK',
  })
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [storageStatus, setStorageStatus] = useState({
    isPersisted: false,
    quota: 0,
    usage: 0,
  })

  // Load initial merchant data on mount
  useEffect(() => {
    let isMounted = true

    async function init() {
      try {
        const data = await loadMerchantData()
        if (isMounted) {
          setInstance(data.instance)
          setSettings(data.settings)
          setProducts(data.products)
          setStorageStatus(data.storageStatus)
        }
      } catch (err) {
        console.error('Chyba při načítání dat pokladny:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [])

  const refreshStorageStatus = useCallback(async () => {
    const status = await checkStorageStatus()
    setStorageStatus(status)
    return status
  }, [])

  const requestPersistence = useCallback(async () => {
    const granted = await requestStoragePersistence()
    const status = await checkStorageStatus()
    setStorageStatus(status)
    return granted
  }, [])

  const updateSettings = useCallback(async (newSettings) => {
    const saved = await saveMerchantSettings(newSettings)
    setSettings(saved)
    setInstance((prev) =>
      prev ? { ...prev, name: saved.businessName, updatedAt: Date.now() } : null
    )
    return saved
  }, [])

  const addProduct = useCallback(
    async (rawProduct) => {
      const newProduct = {
        id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: rawProduct.name.trim(),
        price: Number(rawProduct.price),
        script: rawProduct.script ? rawProduct.script.trim() : '',
        createdAt: Date.now(),
      }
      const updated = [...products, newProduct]
      const saved = await saveMerchantProducts(updated)
      setProducts(saved)
      return newProduct
    },
    [products]
  )

  const updateProduct = useCallback(
    async (id, updates) => {
      const updated = products.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      )
      const saved = await saveMerchantProducts(updated)
      setProducts(saved)
      return saved
    },
    [products]
  )

  const deleteProduct = useCallback(
    async (id) => {
      const updated = products.filter((p) => p.id !== id)
      const saved = await saveMerchantProducts(updated)
      setProducts(saved)
      return saved
    },
    [products]
  )

  const initializeInstance = useCallback(async (initParams) => {
    setIsLoading(true)
    try {
      const res = await initializeMerchantInstance(initParams)
      setInstance(res.instance)
      setSettings(res.settings)
      setProducts(res.products)
      const status = await checkStorageStatus()
      setStorageStatus(status)
      return res
    } finally {
      setIsLoading(false)
    }
  }, [])

  const importInstance = useCallback(async (backupPayload) => {
    setIsLoading(true)
    try {
      const res = await importMerchantBackup(backupPayload)
      setInstance(res.instance)
      setSettings(res.settings)
      setProducts(res.products)
      const status = await checkStorageStatus()
      setStorageStatus(status)
      return res
    } finally {
      setIsLoading(false)
    }
  }, [])

  const exportInstance = useCallback(async () => {
    const backup = await exportMerchantBackup()
    // Trigger browser file download
    const blob = new Blob([backup.jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = backup.filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    return backup
  }, [])

  const deleteInstance = useCallback(async () => {
    setIsLoading(true)
    try {
      await deleteMerchantInstance()
      setInstance(null)
      setSettings({
        businessName: 'Pokladna',
        accountNumber: '',
        bankId: '',
        currency: 'CZK',
      })
      setProducts([])
      const status = await checkStorageStatus()
      setStorageStatus(status)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const value = {
    instance,
    settings,
    products,
    isLoading,
    storageStatus,
    refreshStorageStatus,
    requestPersistence,
    updateSettings,
    addProduct,
    updateProduct,
    deleteProduct,
    initializeInstance,
    importInstance,
    exportInstance,
    deleteInstance,
  }

  return (
    <MerchantContext.Provider value={value}>
      {children}
    </MerchantContext.Provider>
  )
}
