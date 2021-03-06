import {
  positionValidator,
  offsetValidator,
  getTransformProperties,
  parsePosition,
  setPosition
} from '../../utils/popup'
import { frameDebounce } from '../../utils/debounce'
import { getScrollTarget } from '../../utils/scroll'
import { width, viewport } from '../../utils/dom'
import EscapeKey from '../../utils/escape-key'
import ModelToggleMixin from '../../mixins/model-toggle'

export default {
  name: 'q-popover',
  mixins: [ModelToggleMixin],
  props: {
    anchor: {
      type: String,
      default: 'bottom left',
      validator: positionValidator
    },
    self: {
      type: String,
      default: 'top left',
      validator: positionValidator
    },
    fit: Boolean,
    maxHeight: String,
    touchPosition: Boolean,
    anchorClick: {
      /*
        for handling anchor outside of Popover
        example: context menu component
      */
      type: Boolean,
      default: true
    },
    offset: {
      type: Array,
      validator: offsetValidator
    },
    disable: Boolean
  },
  data () {
    return {
      opened: false,
      progress: false
    }
  },
  computed: {
    transformCSS () {
      return getTransformProperties({selfOrigin: this.selfOrigin})
    },
    anchorOrigin () {
      return parsePosition(this.anchor)
    },
    selfOrigin () {
      return parsePosition(this.self)
    }
  },
  render (h) {
    return h('div', {
      staticClass: 'q-popover animate-scale',
      style: this.transformCSS,
      on: {
        click (e) { e.stopPropagation() }
      }
    }, this.$slots.default)
  },
  created () {
    this.__updatePosition = frameDebounce(() => { this.reposition() })
  },
  mounted () {
    this.$nextTick(() => {
      this.anchorEl = this.$el.parentNode
      this.anchorEl.removeChild(this.$el)
      if (this.anchorEl.classList.contains('q-btn-inner')) {
        this.anchorEl = this.anchorEl.parentNode
      }
      if (this.anchorClick) {
        this.anchorEl.classList.add('cursor-pointer')
        this.anchorEl.addEventListener('click', this.toggle)
      }
    })
  },
  beforeDestroy () {
    if (this.anchorClick && this.anchorEl) {
      this.anchorEl.removeEventListener('click', this.toggle)
    }
    this.close()
  },
  methods: {
    toggle (evt) {
      if (this.opened) {
        this.close()
      }
      else {
        this.open(evt)
      }
    },
    open (evt) {
      if (this.disable) {
        return
      }
      if (this.opened) {
        this.__updatePosition()
        return
      }
      if (evt) {
        evt.stopPropagation()
        evt.preventDefault()
      }

      this.opened = true
      document.body.click() // close other Popovers
      document.body.appendChild(this.$el)
      EscapeKey.register(() => { this.close() })
      this.scrollTarget = getScrollTarget(this.anchorEl)
      this.scrollTarget.addEventListener('scroll', this.__updatePosition)
      window.addEventListener('resize', this.__updatePosition)
      this.reposition(evt)
      this.timer = setTimeout(() => {
        this.timer = null
        document.body.addEventListener('click', this.close, true)
        document.body.addEventListener('touchstart', this.close, true)
        this.__updateModel(true)
        this.$emit('open')
      }, 1)
    },
    close (fn) {
      if (!this.opened || this.progress || (fn && fn.target && this.$el.contains(fn.target))) {
        return
      }

      clearTimeout(this.timer)
      document.body.removeEventListener('click', this.close, true)
      document.body.removeEventListener('touchstart', this.close, true)
      this.scrollTarget.removeEventListener('scroll', this.__updatePosition)
      window.removeEventListener('resize', this.__updatePosition)
      EscapeKey.pop()
      this.progress = true

      /*
        Using setTimeout to allow
        v-models to take effect
      */
      setTimeout(() => {
        this.opened = false
        this.progress = false
        document.body.removeChild(this.$el)
        this.__updateModel(false)
        this.$emit('close')
        if (typeof fn === 'function') {
          fn()
        }
      }, 1)
    },
    reposition (event) {
      this.$nextTick(() => {
        if (this.fit) {
          this.$el.style.minWidth = width(this.anchorEl) + 'px'
        }
        const { top } = this.anchorEl.getBoundingClientRect()
        const { height } = viewport()
        if (top < 0 || top > height) {
          return this.close()
        }
        setPosition({
          event,
          el: this.$el,
          offset: this.offset,
          anchorEl: this.anchorEl,
          anchorOrigin: this.anchorOrigin,
          selfOrigin: this.selfOrigin,
          maxHeight: this.maxHeight,
          anchorClick: this.anchorClick,
          touchPosition: this.touchPosition
        })
      })
    }
  }
}
